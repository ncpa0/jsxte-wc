import { JsxteJson } from "jsxte";
import { ArrayMap } from "../utils/array-map";
import { expandFragments } from "../utils/expand-fragments";
import {
  AttributeSetter,
  attributeSetterFactory,
} from "./attribute-setter";
import { VirtualTextNode } from "./virtual-text-node";

export type ElementName = keyof JSX.IntrinsicElements | "";
export type JsonAttribute = [
  attributeName: string,
  value?: string | undefined,
];

export class VirtualElement {
  static createVirtual(
    elemJson: JsxteJson | string,
  ): VirtualElement | VirtualTextNode {
    switch (typeof elemJson) {
      case "string":
        return new VirtualTextNode(elemJson);
      case "object":
        return new VirtualElement(elemJson);
    }
  }

  static createFor(name: string, element: HTMLElement) {
    const instance = Object.setPrototypeOf(
      {
        elementName: name,
        element: element,
        lastUpdatedAttributes: [],
        children: [],
        attributes: new ArrayMap(),
      },
      VirtualElement.prototype,
    );

    return instance;
  }

  public readonly elementName: ElementName;
  public readonly element: HTMLElement;

  private ref?: { current: HTMLElement | null };
  private lastUpdatedAttributes: string[] = [];
  private children: Array<VirtualElement | VirtualTextNode> = [];
  private readonly attributes = new ArrayMap<
    string,
    AttributeSetter
  >();

  public constructor(elemJson: JsxteJson) {
    this.elementName = elemJson.element;
    this.element = document.createElement(this.elementName);
    this.updateAttributes(elemJson.attributes);
    this.updateChildren(elemJson.children);
  }

  private setAttribute(attr: JsonAttribute): void {
    let setter = this.attributes.get(attr[0]);

    if (!setter) {
      setter = attributeSetterFactory(this.element, attr[0]);
      this.attributes.set(attr[0], setter);
    }

    setter(attr[1]);
  }

  public updateAttributes(attributes: JsonAttribute[]): void {
    const updatedAttributes: string[] = [];

    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i]!;

      if (attribute[0] === "ref") {
        const ref = attribute[1] as any as { current: HTMLElement };
        ref.current = this.element;
        this.ref = ref;
        continue;
      }

      this.setAttribute(attribute);
      updatedAttributes.push(attribute[0]);
    }

    for (let i = 0; i < this.lastUpdatedAttributes.length; i++) {
      const attributeName = this.lastUpdatedAttributes[i]!;
      if (!updatedAttributes.includes(attributeName)) {
        const attrSetter = this.attributes.get(attributeName)!;
        attrSetter(undefined);
      }
    }

    this.lastUpdatedAttributes = updatedAttributes;
  }

  public updateChildren(children: Array<JsxteJson | string>): void {
    children = expandFragments(children);

    if (this.children.length > children.length) {
      for (let i = children.length; i < this.children.length; i++) {
        const child = this.children[i]!;
        this.element.removeChild(child.element);
        child.cleanup();
      }
      this.children.splice(children.length);
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      const prevChild = this.children[i];

      if (!prevChild) {
        const newChild = VirtualElement.createVirtual(child);
        this.children[i] = newChild;
        this.element.appendChild(newChild.element);
        continue;
      }

      if (typeof child === "string") {
        if (prevChild.elementName === "text-node") {
          prevChild.update(child);
        } else {
          const newChild = new VirtualTextNode(child);
          this.children[i] = newChild;
          this.element.replaceChild(
            newChild.element,
            prevChild.element,
          );
        }
      } else {
        if (prevChild.elementName === child.element) {
          prevChild.update(child);
        } else {
          const newChild = new VirtualElement(child);
          this.children[i] = newChild;
          this.element.replaceChild(
            newChild.element,
            prevChild.element,
          );
        }
      }
    }
  }

  public getChildElements(): Array<HTMLElement | Text> {
    const result: Array<HTMLElement | Text> = [];

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]!;
      result.push(child.element);
    }

    return result;
  }

  public update(elemJson: JsxteJson): void {
    this.updateAttributes(elemJson.attributes);
    this.updateChildren(elemJson.children);
  }

  public cleanup(): void {
    if (this.ref) {
      this.ref.current = null;
    }

    for (let i = 0; i < this.children.length; i++) {
      this.children[i]!.cleanup();
    }
  }
}
