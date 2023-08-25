export type AttributeSetter = (value: string | undefined) => void;

export function attributeSetterFactory(
  element: HTMLElement,
  attr: string,
): AttributeSetter {
  if (attr.startsWith("on")) {
    let lastValue: EventListenerOrEventListenerObject | undefined =
      undefined;

    return (value: any): void => {
      if (value === lastValue) return;

      const eventName = attr.slice(2).toLowerCase();

      if (lastValue) {
        element.removeEventListener(eventName, lastValue);
      }

      element.addEventListener(eventName, value);

      lastValue = value;
    };
  } else if (attr === "value" && "value" in element) {
    let lastValue: string | undefined = attr[1];

    return (value: any): void => {
      if (value === lastValue) return;

      lastValue = value;
      if (value == null || value === false) {
        element.removeAttribute(attr);
        element.value = "";
      } else {
        element.setAttribute(attr, value);
        element.value = value;
      }
    };
  } else {
    let lastValue: string | undefined = attr[1];

    return (value: any): void => {
      if (value === lastValue) return;

      lastValue = value;
      if (value == null || value === false) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, value);
      }
    };
  }
}
