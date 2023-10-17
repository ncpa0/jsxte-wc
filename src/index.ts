export { Attribute } from "./element/decorator-attribute";
export { CustomElement } from "./element/decorator-custom-element";
export { Slotted } from "./element/decorator-slotted";
export { State } from "./element/decorator-state";
export { Element } from "./element/element";
export * from "./element/element-events";
export { ElementLifecycleEvent } from "./element/element-events";
export { WcSlot } from "./element/slot";

type EventHandlerFunction<E extends Event = Event> = (
  event: E,
) => void;

declare global {
  namespace JSXTE {
    interface BaseHTMLTagProps {
      ref?: { current: HTMLElement | null };
    }

    interface AttributeAcceptedTypes {
      onabort: EventHandlerFunction<UIEvent>;
      onafterprint: EventHandlerFunction<Event>;
      onanimationend: EventHandlerFunction<AnimationEvent>;
      onanimationiteration: EventHandlerFunction<AnimationEvent>;
      onanimationstart: EventHandlerFunction<AnimationEvent>;
      onbeforeprint: EventHandlerFunction<Event>;
      onbeforeunload: EventHandlerFunction<BeforeUnloadEvent>;
      onblur: EventHandlerFunction<FocusEvent>;
      oncanplay: EventHandlerFunction<Event>;
      oncanplaythrough: EventHandlerFunction<Event>;
      onchange: EventHandlerFunction<Event>;
      onclick: EventHandlerFunction<MouseEvent>;
      oncontextmenu: EventHandlerFunction<MouseEvent>;
      oncopy: EventHandlerFunction<ClipboardEvent>;
      oncuechange: EventHandlerFunction<Event>;
      oncut: EventHandlerFunction<ClipboardEvent>;
      ondblclick: EventHandlerFunction<MouseEvent>;
      ondrag: EventHandlerFunction<MouseEvent>;
      ondragend: EventHandlerFunction<MouseEvent>;
      ondragenter: EventHandlerFunction<MouseEvent>;
      ondragleave: EventHandlerFunction<MouseEvent>;
      ondragover: EventHandlerFunction<MouseEvent>;
      ondragstart: EventHandlerFunction<MouseEvent>;
      ondrop: EventHandlerFunction<MouseEvent>;
      ondurationchange: EventHandlerFunction<Event>;
      onemptied: EventHandlerFunction<Event>;
      onended: EventHandlerFunction<Event>;
      onerror: EventHandlerFunction<Event>;
      onfocus: EventHandlerFunction<FocusEvent>;
      onfocusin: EventHandlerFunction<FocusEvent>;
      onfocusout: EventHandlerFunction<FocusEvent>;
      onfullscreenchange: EventHandlerFunction<Event>;
      onfullscreenerror: EventHandlerFunction<Event>;
      ongotpointercapture: EventHandlerFunction<PointerEvent>;
      onhashchange: EventHandlerFunction<HashChangeEvent>;
      oninput: EventHandlerFunction<InputEvent>;
      oninvalid: EventHandlerFunction<Event>;
      onkeydown: EventHandlerFunction<KeyboardEvent>;
      onkeypress: EventHandlerFunction<KeyboardEvent>;
      onkeyup: EventHandlerFunction<KeyboardEvent>;
      onload: EventHandlerFunction<Event>;
      onloadeddata: EventHandlerFunction<Event>;
      onloadedmetadata: EventHandlerFunction<Event>;
      onloadstart: EventHandlerFunction<Event>;
      onlostpointercapture: EventHandlerFunction<PointerEvent>;
      onmessage: EventHandlerFunction<MessageEvent>;
      onmousedown: EventHandlerFunction<MouseEvent>;
      onmouseenter: EventHandlerFunction<MouseEvent>;
      onmouseleave: EventHandlerFunction<MouseEvent>;
      onmousemove: EventHandlerFunction<MouseEvent>;
      onmouseout: EventHandlerFunction<MouseEvent>;
      onmouseover: EventHandlerFunction<MouseEvent>;
      onmouseup: EventHandlerFunction<MouseEvent>;
      onmousewheel: EventHandlerFunction<WheelEvent>;
      onoffline: EventHandlerFunction<Event>;
      ononline: EventHandlerFunction<Event>;
      onopen: EventHandlerFunction<Event>;
      onpagehide: EventHandlerFunction<PageTransitionEvent>;
      onpageshow: EventHandlerFunction<PageTransitionEvent>;
      onpaste: EventHandlerFunction<ClipboardEvent>;
      onpause: EventHandlerFunction<Event>;
      onplay: EventHandlerFunction<Event>;
      onplaying: EventHandlerFunction<Event>;
      onpointercancel: EventHandlerFunction<PointerEvent>;
      onpointerdown: EventHandlerFunction<PointerEvent>;
      onpointerenter: EventHandlerFunction<PointerEvent>;
      onpointerleave: EventHandlerFunction<PointerEvent>;
      onpointermove: EventHandlerFunction<PointerEvent>;
      onpointerout: EventHandlerFunction<PointerEvent>;
      onpointerover: EventHandlerFunction<PointerEvent>;
      onpointerup: EventHandlerFunction<PointerEvent>;
      onpopstate: EventHandlerFunction<PopStateEvent>;
      onprogress: EventHandlerFunction<ProgressEvent>;
      onratechange: EventHandlerFunction<Event>;
      onreset: EventHandlerFunction<Event>;
      onresize: EventHandlerFunction<UIEvent>;
      onscroll: EventHandlerFunction<UIEvent>;
      onsearch: EventHandlerFunction<Event>;
      onseeked: EventHandlerFunction<Event>;
      onseeking: EventHandlerFunction<Event>;
      onselect: EventHandlerFunction<UIEvent>;
      onshow: EventHandlerFunction<Event>;
      onstalled: EventHandlerFunction<Event>;
      onstorage: EventHandlerFunction<StorageEvent>;
      onsubmit: EventHandlerFunction<Event>;
      onsuspend: EventHandlerFunction<Event>;
      ontimeupdate: EventHandlerFunction<Event>;
      ontoggle: EventHandlerFunction<Event>;
      ontouchcancel: EventHandlerFunction<TouchEvent>;
      ontouchend: EventHandlerFunction<TouchEvent>;
      ontouchmove: EventHandlerFunction<TouchEvent>;
      ontouchstart: EventHandlerFunction<TouchEvent>;
      ontransitionend: EventHandlerFunction<TransitionEvent>;
      onunload: EventHandlerFunction<UIEvent>;
      onvolumechange: EventHandlerFunction<Event>;
      onwaiting: EventHandlerFunction<Event>;
      onwheel: EventHandlerFunction<WheelEvent>;
    }
  }
}
