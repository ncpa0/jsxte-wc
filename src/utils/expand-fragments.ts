import { JsxteJson } from "jsxte";

export function expandFragments(elements: Array<JsxteJson | string>) {
  let expandedElements: Array<JsxteJson | string> = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]!;
    if (typeof element === "string") {
      expandedElements.push(element);
      continue;
    }

    if (element.element === "") {
      expandedElements = expandedElements.concat(
        expandFragments(element.children),
      );
      continue;
    }

    expandedElements.push(element);
  }

  return expandedElements;
}
