export function CustomElement(tagName: `${string}-${string}`) {
  return (
    target: CustomElementConstructor,
    _: ClassDecoratorContext,
  ) => {
    customElements.define(tagName, target);
  };
}
