import { JsxteJson, renderToJson } from "jsxte";
import { EventEmitter } from "../utils/event-emitter";
import { VirtualElement } from "../vdom/virtual-element";
import {
  ElementAttributeDidChangeEvent,
  ElementDidMountEvent,
  ElementDidUpdateEvent,
  ElementLifecycleEvent,
  ElementSlotDidChangeEvent,
  ElementStateDidChangeEvent,
  ElementWillMountEvent,
  ElementWillUpdateEvent,
} from "./element-events";
import { RequestBatch } from "./request-batch";
import { OnSlotChangeCallback } from "./decorator-slotted";
import { WcSlot } from "./slot";

export type Dependency<T> = {
  getValue: () => T;
  name: string;
};

const noop = () => {};

const createRoot = (element: Element) => {
  const root = document.createElement("div");
  root.style.display = "contents";

  const additionalClassNames = element.getRootClassNames?.() ?? [];
  root.classList.add("wc-root", ...additionalClassNames);

  return root;
};

export abstract class Element extends HTMLElement {
  private _vroot?: VirtualElement;
  private _root = createRoot(this);
  private _requestBatch = new RequestBatch(() => this._updateDom());
  private _attributeObserver = new MutationObserver((a) =>
    this._handleObserverEvent(a),
  );
  private _observedAttributes: string[] = [];
  private _isObservingSlots = false;
  private _slotChangeListeners: OnSlotChangeCallback[] = [];
  private _isConnected = false;

  private _dependencySelector = new Proxy(
    {},
    {
      get: (_, prop) => {
        return {
          getValue: () => (this as any)[prop],
          name: prop as string,
        };
      },
    },
  ) as any;

  public lifecycle = new EventEmitter();

  constructor() {
    super();
  }

  private _performFirstMount(
    content: Array<JsxteJson | string>,
  ): void {
    this._vroot = VirtualElement.createFor("<root>", this._root);
    this._vroot!.updateChildren(content);

    queueMicrotask(() => {
      this.lifecycle.dispatchEvent(new ElementDidMountEvent());
    });
  }

  private _updateDom(): void {
    this.lifecycle.dispatchEvent(new ElementWillUpdateEvent());

    const jsxElem = this.render();
    const json = renderToJson(jsxElem);

    if (this._vroot) {
      this._vroot.updateChildren([json]);
    } else {
      this._performFirstMount([json]);
    }

    queueMicrotask(() => {
      this.lifecycle.dispatchEvent(new ElementDidUpdateEvent());
    });
  }

  private _handleObserverEvent(mutationRecord: MutationRecord[]) {
    for (let i = 0; i < mutationRecord.length; i++) {
      const record = mutationRecord[i]!;
      if (record.attributeName) {
        this.lifecycle.dispatchEvent(
          new ElementAttributeDidChangeEvent(
            record.attributeName,
            record.oldValue,
            this.getAttribute(record.attributeName),
          ),
        );
      } else if (record.type === "childList") {
        this._handleContentMutation(record);
      }
    }
  }

  private _handleContentMutation(record: MutationRecord) {
    const added: WcSlot[] = [];
    const removed: WcSlot[] = [];

    for (let j = 0; j < record.addedNodes.length; j++) {
      const node = record.addedNodes[j]!;
      if (WcSlot.isSlot(node)) {
        added.push(node);
        node.emitter.addEventListener(
          "slotcontentchange",
          this.handleSlotContentChange,
        );
        node.emitter.addEventListener(
          "slotattributechange",
          this.handleSlotAttributeChange.bind(this, node),
        );
      }
    }

    for (let j = 0; j < record.removedNodes.length; j++) {
      const node = record.removedNodes[j]!;
      if (WcSlot.isSlot(node)) {
        removed.push(node);
        node.emitter.removeEventListener(
          "slotcontentchange",
          this.handleSlotContentChange,
        );
        node.emitter.removeEventListener(
          "slotattributechange",
          this.handleSlotAttributeChange.bind(this, node),
        );
      }
    }

    for (const listener of this._slotChangeListeners) {
      listener({ added, removed, updated: [] });
    }
  }

  public handleSlotContentChange = () => {
    this.requestUpdate();
  };

  public handleSlotAttributeChange = (slot: WcSlot) => {
    for (const listener of this._slotChangeListeners) {
      listener({ updated: [slot], added: [], removed: [] });
    }
  };

  public observeAttribute(attributeName: string): void {
    this._observedAttributes.push(attributeName);
  }

  public observeSlots(listener: OnSlotChangeCallback): void {
    this._isObservingSlots = true;
    this._slotChangeListeners.push(listener);
  }

  public requestUpdate(): void {
    if (this._isConnected) {
      this._requestBatch.request();
    }
  }

  public connectedCallback(): void {
    this.appendChild(this._root);

    this._isConnected = true;

    this._attributeObserver.observe(this, {
      attributeFilter: this._observedAttributes,
      attributeOldValue: true,
      attributes: true,
      childList: this._isObservingSlots,
      subtree: false,
    });

    this.lifecycle.dispatchEvent(new ElementWillMountEvent());
    this.requestUpdate();
  }

  public disconnectedCallback(): void {
    this._isConnected = false;
    this._attributeObserver.disconnect();
  }

  /**
   * Registers a callback that will be ran on every change of the
   * specified dependencies (attribute or state).
   *
   * This effect always happens after the DOM has been updated.
   *
   * @returns A `stop` function that cancels the effect.
   */
  public effect<E extends Element>(
    this: E,
    cb: () => void | (() => void),
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

    let cleanup = noop;
    const callback = () => {
      cleanup();
      cleanup = cb() || noop;
    };

    if (!deps) {
      const updateHandler = () => callback;
      this.lifecycle.on(
        ElementLifecycleEvent.DidUpdate,
        updateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidUpdate,
          updateHandler,
        );
      };
    }

    if (deps.length === 0) {
      const updateHandler = () => callback;
      this.lifecycle.once(
        ElementLifecycleEvent.DidMount,
        updateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidMount,
          updateHandler,
        );
      };
    }

    const depNamesForAttr = deps.map((d) => d.name.toLowerCase());
    const depNamesForSlotOrState = deps.map((d) => d.name);

    let runCallbackOnNextUpdate = false;

    const attribChangeHandler = (
      ev: ElementAttributeDidChangeEvent,
    ) => {
      if (depNamesForAttr.includes(ev.detail.attributeName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const stateChangeHandler = (ev: ElementStateDidChangeEvent) => {
      if (depNamesForSlotOrState.includes(ev.detail.stateName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const slotChangeHandler = (ev: ElementSlotDidChangeEvent) => {
      if (depNamesForSlotOrState.includes(ev.detail.slotName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const didUpdateHandler = () => {
      if (runCallbackOnNextUpdate) {
        runCallbackOnNextUpdate = false;
        callback();
      }
    };

    this.lifecycle.on(
      ElementLifecycleEvent.AttributeDidChange,
      attribChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.StateDidChange,
      stateChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.DidUpdate,
      didUpdateHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.SlotDidChange,
      slotChangeHandler,
    );

    const stop = (): void => {
      this.lifecycle.off(
        ElementLifecycleEvent.AttributeDidChange,
        attribChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.StateDidChange,
        stateChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.DidUpdate,
        didUpdateHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.SlotDidChange,
        slotChangeHandler,
      );
    };

    return stop;
  }

  /**
   * Registers a callback that will be ran on every change of the
   * specified dependencies (attribute or state).
   *
   * This effect always happens right before the render, meaning that
   * state and attribute changes within it will affect the subsequent
   * render result and won't trigger another re-render.
   *
   * @returns A `stop` function that cancels the effect.
   */
  public immediateEffect<E extends Element>(
    this: E,
    cb: () => void | (() => void),
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

    let cleanup = noop;
    const callback = () => {
      cleanup();
      cleanup = cb() || noop;
    };

    if (!deps) {
      const updateHandler = () => callback;
      this.lifecycle.on(
        ElementLifecycleEvent.WillUpdate,
        updateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.WillUpdate,
          updateHandler,
        );
      };
    }

    if (deps.length === 0) {
      const updateHandler = () => callback;
      this.lifecycle.once(
        ElementLifecycleEvent.DidMount,
        updateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidMount,
          updateHandler,
        );
      };
    }

    const depNamesForAttr = deps.map((d) => d.name.toLowerCase());
    const depNamesForSlotOrState = deps.map((d) => d.name);

    let runCallbackOnNextUpdate = false;

    const attribChangeHandler = (
      ev: ElementAttributeDidChangeEvent,
    ) => {
      if (depNamesForAttr.includes(ev.detail.attributeName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const stateChangeHandler = (ev: ElementStateDidChangeEvent) => {
      if (depNamesForSlotOrState.includes(ev.detail.stateName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const slotChangeHandler = (ev: ElementSlotDidChangeEvent) => {
      if (depNamesForSlotOrState.includes(ev.detail.slotName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const didUpdateHandler = () => {
      if (runCallbackOnNextUpdate) {
        runCallbackOnNextUpdate = false;
        callback();
      }
    };

    this.lifecycle.on(
      ElementLifecycleEvent.AttributeDidChange,
      attribChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.StateDidChange,
      stateChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.WillUpdate,
      didUpdateHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.SlotDidChange,
      slotChangeHandler,
    );

    const stop = (): void => {
      this.lifecycle.off(
        ElementLifecycleEvent.AttributeDidChange,
        attribChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.StateDidChange,
        stateChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.WillUpdate,
        didUpdateHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.SlotDidChange,
        slotChangeHandler,
      );
    };

    return stop;
  }

  protected abstract render(): JSX.Element;

  public abstract getRootClassNames?(): string[];
}
