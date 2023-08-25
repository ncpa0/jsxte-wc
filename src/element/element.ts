import { renderToJson } from "jsxte";
import { EventEmitter } from "../utils/event-emitter";
import { VirtualElement } from "../vdom/virtual-element";
import { VirtualTextNode } from "../vdom/virtual-text-node";
import {
  ElementAttributeDidChangeEvent,
  ElementDidMountEvent,
  ElementDidUpdateEvent,
  ElementWillUpdateEvent,
} from "./element-events";
import { RequestBatch } from "./request-batch";

export abstract class Element extends HTMLElement {
  private _rootElement?: VirtualElement | VirtualTextNode;
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

  private _updateDom(): void {
    this.lifecycle.dispatchEvent(new ElementWillUpdateEvent());

    const jsxElem = this.render();
    const json = renderToJson(jsxElem);

    if (this._rootElement) {
      if (typeof json === "string") {
        if (this._rootElement.elementName !== "text-node") {
          this._rootElement = new VirtualTextNode(json);
          this.replaceChildren(this._rootElement.element);
        } else {
          this._rootElement.update(json);
        }
      } else {
        if (this._rootElement.elementName !== json.element) {
          this._rootElement = new VirtualElement(json);
          this.replaceChildren(this._rootElement.element);
        } else {
          this._rootElement.update(json);
        }
      }
    } else {
      if (typeof json === "string") {
        this._rootElement = new VirtualTextNode(json);
        this.replaceChildren(this._rootElement.element);
      } else {
        this._rootElement = new VirtualElement(json);
        this.replaceChildren(this._rootElement.element);
      }
      this.lifecycle.dispatchEvent(
        new ElementDidMountEvent(this._rootElement!.element),
      );
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

  protected abstract render(): JSX.Element;
}
