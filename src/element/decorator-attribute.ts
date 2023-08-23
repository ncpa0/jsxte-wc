import { Element } from "./element";
import { CustomElementEvent } from "./element-events";

export type AttributeOptions = {
  type?: "boolean" | "number" | "string";
};

function attribValueParserFactory<V>(
  type: Exclude<AttributeOptions["type"], undefined>,
): (v: string) => V {
  switch (type) {
    case "number":
      return (value: string) => Number(value) as V;
    case "string":
      return (value: string) => value as V;
    case "boolean":
      return (value: string) => {
        const lower = value.toLowerCase();
        switch (lower) {
          case "true":
            return true as V;
          case "false":
            return false as V;
        }
        return Boolean(value) as V;
      };
  }
}

export function Attribute(opts: AttributeOptions = {}) {
  return <E extends Element, V>(
    accessor: ClassAccessorDecoratorTarget<E, V>,
    context: ClassAccessorDecoratorContext<E, V>,
  ): ClassAccessorDecoratorResult<E, V> => {
    const attributeName = (context.name as string).toLowerCase();
    const valueParser = attribValueParserFactory<V>(
      opts.type ?? "string",
    );

    context.addInitializer(function () {
      this.observeAttribute(attributeName);

      this.lifecycle.addEventListener(
        CustomElementEvent.AttributeDidChange,
        (event) => {
          if (event.detail.attributeName === attributeName) {
            accessor.set.call(
              this,
              valueParser(event.detail.newValue),
            );
            this.requestUpdate();
          }
        },
      );
    });

    return {
      get() {
        return accessor.get.call(this);
      },
      set(value: V) {
        // This should trigger the mutation observer
        // and the event listener above.
        this.setAttribute(attributeName, String(value));
      },
      init(value) {
        const initialValue = this.getAttribute(attributeName);
        if (initialValue !== null) {
          return valueParser(initialValue);
        }
        if (value != null) {
          this.setAttribute(attributeName, String(value));
        }
        return value;
      },
    };
  };
}
