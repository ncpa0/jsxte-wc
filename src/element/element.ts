import { renderToJson } from "jsxte";
import { EventEmitter } from "../utils/event-emitter";
import { VirtualElement } from "../vdom/virtual-element";
import { AttributeController } from "./attribute-controller";
import { OnSlotChangeCallback } from "./decorator-slotted";
import {
  ElementAttributeDidChangeEvent,
  ElementDidMountEvent,
  ElementDidUnmountEvent,
  ElementDidUpdateEvent,
  ElementLifecycleEvent,
  ElementSlotDidChangeEvent,
  ElementStateDidChangeEvent,
  ElementWillMountEvent,
  ElementWillUpdateEvent,
} from "./element-events";
import { RequestBatch } from "./request-batch";
import {
  SlotAttributeChangeEvent,
  SlotContentChangeEvent,
  WcSlot,
} from "./slot";

export type Dependency<T> = {
  getValue: () => T;
  name: string;
};

export type Effect = {
  isFirstMount: boolean;
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
  private _attributeController = new AttributeController(this);
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

  private _performFirstMount(): () => void {
    this.lifecycle.dispatchEvent(new ElementWillMountEvent());
    this._attributeController.syncUpAll();
    const jsxElem = this.render();
    const json = renderToJson(jsxElem);
    this._vroot = VirtualElement.createFor("<root>", this._root);
    this._vroot!.updateChildren([json]);
    return () =>
      this.lifecycle.dispatchEvent(new ElementDidMountEvent());
  }

  private _preformNextUpdate(): () => void {
    this.lifecycle.dispatchEvent(new ElementWillUpdateEvent());
    const jsxElem = this.render();
    const json = renderToJson(jsxElem);
    this._vroot!.updateChildren([json]);
    return () =>
      this.lifecycle.dispatchEvent(new ElementDidUpdateEvent());
  }

  private _updateDom(): () => void {
    if (this._vroot) {
      return this._preformNextUpdate();
    } else {
      return this._performFirstMount();
    }
  }

  private _handleObserverEvent(mutationRecord: MutationRecord[]) {
    for (let i = 0; i < mutationRecord.length; i++) {
      const record = mutationRecord[i]!;
      if (record.attributeName) {
        this._attributeController.detectedPossibleChange(record);
        // const newValue = this.getAttribute(record.attributeName);
        // if (!Object.is(record.oldValue, newValue)) {
        //   this.lifecycle.dispatchEvent(
        //     new ElementAttributeDidChangeEvent(
        //       record.attributeName,
        //       record.oldValue,
        //       newValue,
        //     ),
        //   );
        // }
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
        this.connectToWcSlot(node);
      }
    }

    for (let j = 0; j < record.removedNodes.length; j++) {
      const node = record.removedNodes[j]!;
      if (WcSlot.isSlot(node)) {
        removed.push(node);
        this.disconnectFromWcSlot(node);
      }
    }

    for (const listener of this._slotChangeListeners) {
      listener({
        added: added.slice(),
        removed: removed.slice(),
        attributeChanged: [],
        contentChanged: [],
      });
    }
  }

  public connectToWcSlot(node: WcSlot) {
    node.emitter.addEventListener(
      "slotcontentchange",
      this.handleSlotContentChange as any,
    );
    node.emitter.addEventListener(
      "slotattributechange",
      this.handleSlotAttributeChange as any,
    );
  }

  public disconnectFromWcSlot(node: WcSlot) {
    node.emitter.removeEventListener(
      "slotcontentchange",
      this.handleSlotContentChange as any,
    );
    node.emitter.removeEventListener(
      "slotattributechange",
      this.handleSlotAttributeChange as any,
    );
  }

  public handleSlotContentChange = (
    event: SlotContentChangeEvent,
  ) => {
    for (const listener of this._slotChangeListeners) {
      listener({
        contentChanged: [event.detail.node],
        attributeChanged: [],
        added: [],
        removed: [],
      });
    }
  };

  public handleSlotAttributeChange = (
    event: SlotAttributeChangeEvent,
  ) => {
    for (const listener of this._slotChangeListeners) {
      listener({
        contentChanged: [],
        attributeChanged: [event.detail.node],
        added: [],
        removed: [],
      });
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

    this.requestUpdate();
  }

  public disconnectedCallback(): void {
    this._isConnected = false;
    this._attributeObserver.disconnect();

    const children = Array.from(this.children);

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      if (WcSlot.isSlot(child)) {
        this.disconnectFromWcSlot(child);
      }
    }

    this.lifecycle.dispatchEvent(new ElementDidUnmountEvent());
  }

  /**
   * Registers a callback that will be ran on every change of the
   * specified dependencies (attribute or state) and after first
   * mount.
   *
   * This effect always happens after the DOM has been updated.
   *
   * @returns A `stop` function that cancels the effect.
   */
  public effect<E extends Element>(
    this: E,
    cb: (effect: Effect) => void | (() => void),
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

    let cleanup = noop;

    const runCleanup = () => {
      cleanup();
      cleanup = noop;
    };

    const callback = (effect: Effect) => {
      runCleanup();
      cleanup = cb(effect) ?? noop;
    };

    if (!deps) {
      const didMountHandler = () => {
        callback({
          isFirstMount: true,
        });
      };
      const didUpdateHandler = () => {
        callback({
          isFirstMount: false,
        });
      };

      this.lifecycle.once(
        ElementLifecycleEvent.DidUnmount,
        runCleanup,
      );
      this.lifecycle.once(
        ElementLifecycleEvent.DidMount,
        didMountHandler,
      );
      this.lifecycle.on(
        ElementLifecycleEvent.DidUpdate,
        didUpdateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidUnmount,
          runCleanup,
        );
        this.lifecycle.off(
          ElementLifecycleEvent.DidMount,
          didMountHandler,
        );
        this.lifecycle.off(
          ElementLifecycleEvent.DidUpdate,
          didUpdateHandler,
        );

        runCleanup();
      };
    }

    if (deps.length === 0) {
      const handler = () => {
        callback({
          isFirstMount: true,
        });
      };

      this.lifecycle.once(
        ElementLifecycleEvent.DidUnmount,
        runCleanup,
      );
      this.lifecycle.once(ElementLifecycleEvent.DidMount, handler);
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidUnmount,
          runCleanup,
        );
        this.lifecycle.off(ElementLifecycleEvent.DidMount, handler);

        runCleanup();
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
        callback({
          isFirstMount: false,
        });
      }
    };

    const didMountHandler = () => {
      runCallbackOnNextUpdate = false;
      callback({
        isFirstMount: true,
      });
    };

    this.lifecycle.once(
      ElementLifecycleEvent.DidMount,
      didMountHandler,
    );
    this.lifecycle.once(ElementLifecycleEvent.DidUnmount, runCleanup);

    this.lifecycle.on(
      ElementLifecycleEvent.AttributeDidChange,
      attribChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.StateDidChange,
      stateChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.SlotDidChange,
      slotChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.DidUpdate,
      didUpdateHandler,
    );

    const cancel = (): void => {
      this.lifecycle.off(
        ElementLifecycleEvent.DidMount,
        didMountHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.DidUnmount,
        runCleanup,
      );

      this.lifecycle.off(
        ElementLifecycleEvent.AttributeDidChange,
        attribChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.StateDidChange,
        stateChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.SlotDidChange,
        slotChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.DidUpdate,
        didUpdateHandler,
      );

      runCleanup();
    };

    return cancel;
  }

  /**
   * Registers a callback that will be ran on every change of the
   * specified dependencies (attribute or state) and before first
   * mount.
   *
   * This effect always happens right before the render, meaning that
   * state and attribute changes within it will affect the subsequent
   * render result and won't trigger another re-render.
   *
   * @returns A `stop` function that cancels the effect.
   */
  public immediateEffect<E extends Element>(
    this: E,
    cb: (effect: Effect) => void | (() => void),
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

    let cleanup = noop;

    const runCleanup = () => {
      cleanup();
      cleanup = noop;
    };

    const callback = (effect: Effect) => {
      runCleanup();
      cleanup = cb(effect) ?? noop;
    };

    if (!deps) {
      const willMountHandler = () => {
        callback({
          isFirstMount: true,
        });
      };
      const willUpdateHandler = () => {
        callback({
          isFirstMount: false,
        });
      };

      this.lifecycle.once(
        ElementLifecycleEvent.DidUnmount,
        runCleanup,
      );
      this.lifecycle.once(
        ElementLifecycleEvent.WillMount,
        willMountHandler,
      );
      this.lifecycle.on(
        ElementLifecycleEvent.WillUpdate,
        willUpdateHandler,
      );
      return () => {
        this.lifecycle.off(
          ElementLifecycleEvent.DidUnmount,
          runCleanup,
        );
        this.lifecycle.off(
          ElementLifecycleEvent.WillMount,
          willMountHandler,
        );
        this.lifecycle.off(
          ElementLifecycleEvent.WillUpdate,
          willUpdateHandler,
        );

        runCleanup();
      };
    }

    if (deps.length === 0) {
      const handler = () => {
        callback({
          isFirstMount: true,
        });
      };
      this.lifecycle.once(ElementLifecycleEvent.WillMount, handler);
      return () => {
        this.lifecycle.off(ElementLifecycleEvent.WillMount, handler);

        runCleanup();
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

    const willUpdateHandler = () => {
      if (runCallbackOnNextUpdate) {
        runCallbackOnNextUpdate = false;
        callback({
          isFirstMount: false,
        });
      }
    };

    const willMountHandler = () => {
      runCallbackOnNextUpdate = false;
      callback({
        isFirstMount: true,
      });
    };

    this.lifecycle.once(
      ElementLifecycleEvent.WillMount,
      willMountHandler,
    );
    this.lifecycle.once(ElementLifecycleEvent.DidUnmount, runCleanup);

    this.lifecycle.on(
      ElementLifecycleEvent.AttributeDidChange,
      attribChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.StateDidChange,
      stateChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.SlotDidChange,
      slotChangeHandler,
    );
    this.lifecycle.on(
      ElementLifecycleEvent.WillUpdate,
      willUpdateHandler,
    );

    const cancel = (): void => {
      this.lifecycle.off(
        ElementLifecycleEvent.WillMount,
        willMountHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.DidUnmount,
        runCleanup,
      );

      this.lifecycle.off(
        ElementLifecycleEvent.AttributeDidChange,
        attribChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.StateDidChange,
        stateChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.SlotDidChange,
        slotChangeHandler,
      );
      this.lifecycle.off(
        ElementLifecycleEvent.WillUpdate,
        willUpdateHandler,
      );

      runCleanup();
    };

    return cancel;
  }

  protected abstract render(): JSX.Element;

  /**
   * Override this method to add additional class names to the root
   * element.
   *
   * @returns An array of class names (string[])
   */
  public getRootClassNames?(): string[];
}
