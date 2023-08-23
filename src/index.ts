export { Attribute } from "./element/decorator-attribute";
export { CustomElement } from "./element/decorator-custom-element";
export { State } from "./element/decorator-state";
export { Element } from "./element/element";
export * from "./element/element-events";
export { CustomElementEvent } from "./element/element-events";
export { VirtualElement } from "./vdom/virtual-element";
export { VirtualTextNode } from "./vdom/virtual-text-node";

declare global {
  namespace JSXTE {
    interface BaseHTMLTagProps {
      ref?: { current: HTMLElement | null };
    }
  }
}
