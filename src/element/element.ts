import { JsxteJson, renderToJson } from "jsxte";
import { EventEmitter } from "../utils/event-emitter";
import { VirtualElement } from "../vdom/virtual-element";
import {
  ElementAttributeDidChangeEvent,
  ElementDidMountEvent,
  ElementDidUpdateEvent,
  ElementWillUpdateEvent,
} from "./element-events";
import { RequestBatch } from "./request-batch";

export abstract class Element extends HTMLElement {
  private _vroot?: VirtualElement;
  private _root = this;
  private _requestBatch = new RequestBatch(() => this._updateDom());
  private _attributeObserver = new MutationObserver((a) =>
    this._handleAttributeChange(a),
  );
  private _observedAttributes: string[] = [];
  private _isConnected = false;

  public lifecycle = new EventEmitter();

  constructor() {
    super();
  }

  private _performFirstMount(
    content: Array<JsxteJson | string>,
  ): void {
    this._vroot = VirtualElement.createFor("<root>", this._root);
    this._vroot!.updateChildren(content);

    this.lifecycle.dispatchEvent(new ElementDidMountEvent());
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

    this.lifecycle.dispatchEvent(new ElementDidUpdateEvent());
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

  protected abstract render(): JSX.Element;
}
