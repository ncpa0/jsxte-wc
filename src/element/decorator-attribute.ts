import { Attribute as AttributeProxy } from "./attribute-controller";
import { Element } from "./element";
import { ElementLifecycleEvent } from "./element-events";

export type AttributeOptions = {
  /**
   * Set this to true to allow null values.
   *
   * When non-nullable, default values will be assigned to the
   * attribute accessor when null.
   */
  nullable?: boolean;
  /**
   * By default the decorated property name will be used as the
   * attribute name.
   *
   * By specifying this option, you can override that value.
   *
   * Attribute name will always be converted to lowercase.
   */
  name?: string;
} & (
  | {
      type: "boolean";
      /**
       * When non-nullable defines the value that will be used when
       * the attribute is set to null.
       *
       * If not specified `false` will be used.
       */
      default?: boolean;
    }
  | {
      type: "number";
      /**
       * When non-nullable defines the value that will be used when
       * the attribute is set to null.
       *
       * If not specified `0` will be used.
       */
      default?: number;
    }
  | {
      type?: "string" | undefined;
      /**
       * When non-nullable defines the value that will be used when
       * the attribute is set to null.
       *
       * If not specified `""` will be used.
       */
      default?: string;
    }
);

function nullableNumberParser(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function nonNullableNumberParser(
  value: string | null,
  defaultValue = 0,
): number {
  return value === null ? defaultValue : Number(value);
}

function nullableStringParser(value: string | null): string | null {
  return value;
}

function nonNullableStringParser(
  value: string | null,
  defaultValue = "",
): string {
  return value === null ? defaultValue : value;
}

function nullableBooleanParser(
  attributeName: string,
  value: string | null,
): boolean | null {
  switch (value) {
    case "":
    case "true":
      return true;
    case "false":
      return false;
  }

  if (typeof value === "string") {
    return value === attributeName;
  }

  return null;
}

function nonNullableBooleanParser(
  attributeName: string,
  value: string | null,
  defaultValue = false,
): boolean {
  switch (value) {
    case "":
    case "true":
      return true;
    case "false":
      return false;
  }

  return value === attributeName ? true : defaultValue;
}

function attribValueParserFactory<V>(
  attributeName: string,
  opts: AttributeOptions,
): (v: string | null) => V {
  const { nullable = false } = opts;

  switch (opts.type) {
    case "number":
      if (nullable) {
        return nullableNumberParser as any;
      }
      return (v) => nonNullableNumberParser(v, opts.default) as any;
    case "boolean":
      if (nullable) {
        return (v) => nullableBooleanParser(attributeName, v) as any;
      }
      return (v) =>
        nonNullableBooleanParser(
          attributeName,
          v,
          opts.default,
        ) as any;
  }

  if (nullable) {
    return nullableStringParser as any;
  }
  return (v) => nonNullableStringParser(v, opts.default) as any;
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
      attributeName,
      opts,
    );

    return {
      get() {
        return this["_attributeController"]
          .getAttribute(attributeName)
          ?.get();
      },
      set(value: V) {
        this["_attributeController"]
          .getAttribute(attributeName)
          ?.set(value);
      },
      init(value) {
        const attr = new AttributeProxy(attributeName, valueParser);
        this["_attributeController"].registerAttribute(attr);

        const htmlValue = this.getAttribute(attributeName);
        if (htmlValue !== null) {
          attr.setInternal(valueParser(htmlValue));
        } else {
          attr.setInternal(value == null ? valueParser(null) : value);
        }

        this.lifecycle.on(ElementLifecycleEvent.WillMount, () => {
          const htmlValue = this.getAttribute(attributeName);
          if (!attr.isEqualToRaw(htmlValue)) {
            attr.setInternal(valueParser(htmlValue));
          }
        });

        return attr.get()!;
      },
    };
  };
}
