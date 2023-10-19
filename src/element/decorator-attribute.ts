import { Element } from "./element";
import { ElementLifecycleEvent } from "./element-events";

export type AttributeOptions = {
  type?: "boolean" | "number" | "string";
  /**
   * By default the decorated property name will be used as the
   * attribute name.
   *
   * By specifying this option, you can override that value.
   *
   * Attribute name will always be converted to lowercase.
   */
  name?: string;
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
    const attributeName = (
      opts.name ?? (context.name as string)
    ).toLowerCase();
    const valueParser = attribValueParserFactory<V>(
      opts.type ?? "string",
    );

    let setAttributeTo: string | null = null;

    context.addInitializer(function () {
      this.observeAttribute(attributeName);

      this.lifecycle.addEventListener(
        ElementLifecycleEvent.AttributeDidChange,
        (event) => {
          if (event.detail.attributeName === attributeName) {
            accessor.set.call(
              this,
              valueParser(String(event.detail.newValue)),
            );
            this.requestUpdate();
          }
        },
      );

      this.lifecycle.once(ElementLifecycleEvent.WillMount, () => {
        if (setAttributeTo !== null) {
          this.setAttribute(attributeName, setAttributeTo);
        }
      });
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
          setAttributeTo = String(value);
        }
        return value;
      },
    };
  };
}
