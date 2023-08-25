import { JsxteJson, renderToJson } from "jsxte";
import { EventEmitter } from "../utils/event-emitter";
import { VirtualElement } from "../vdom/virtual-element";
import {
  ElementAttributeDidChangeEvent,
  ElementDidMountEvent,
  ElementDidUpdateEvent,
  ElementLifecycleEvent,
  ElementStateDidChangeEvent,
  ElementWillUpdateEvent,
} from "./element-events";
import { RequestBatch } from "./request-batch";

export type Dependency<T> = {
  getValue: () => T;
  name: string;
};

export abstract class Element extends HTMLElement {
  private _vroot?: VirtualElement;
  private _root = this;
  private _requestBatch = new RequestBatch(() => this._updateDom());
  private _attributeObserver = new MutationObserver((a) =>
    this._handleAttributeChange(a),
  );
  private _observedAttributes: string[] = [];
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

  private _handleAttributeChange(mutationRecord: MutationRecord[]) {
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
      }
    }
  }

  public observeAttribute(attributeName: string): void {
    this._observedAttributes.push(attributeName);
  }

  public requestUpdate(): void {
    if (this._isConnected) {
      this._requestBatch.request();
    }
  }

  public connectedCallback(): void {
    this._isConnected = true;

    this._attributeObserver.observe(this, {
      attributeFilter: this._observedAttributes,
      attributeOldValue: true,
      attributes: true,
      childList: false,
      subtree: false,
    });

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
    callback: Function,
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

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
    const depNamesForState = deps.map((d) => d.name);

    let runCallbackOnNextUpdate = false;

    const attribChangeHandler = (
      ev: ElementAttributeDidChangeEvent,
    ) => {
      if (depNamesForAttr.includes(ev.detail.attributeName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const stateChangeHandler = (ev: ElementStateDidChangeEvent) => {
      if (depNamesForState.includes(ev.detail.stateName)) {
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
    callback: Function,
    getDependencies: (select: {
      [K in keyof Omit<E, keyof Element | "render">]: Dependency<
        E[K]
      >;
    }) => Dependency<any>[] | void,
  ): () => void {
    const deps = getDependencies(this._dependencySelector);

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
    const depNamesForState = deps.map((d) => d.name);

    let runCallbackOnNextUpdate = false;

    const attribChangeHandler = (
      ev: ElementAttributeDidChangeEvent,
    ) => {
      if (depNamesForAttr.includes(ev.detail.attributeName)) {
        runCallbackOnNextUpdate = true;
      }
    };

    const stateChangeHandler = (ev: ElementStateDidChangeEvent) => {
      if (depNamesForState.includes(ev.detail.stateName)) {
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
    };

    return stop;
  }

  protected abstract render(): JSX.Element;
}
