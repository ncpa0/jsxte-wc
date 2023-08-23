import { Element } from "./element";
import { ElementStateDidChangeEvent } from "./element-events";

export function State() {
  return <E extends Element, V>(
    accessor: ClassAccessorDecoratorTarget<E, V>,
    context: ClassAccessorDecoratorContext<E, V>,
  ): ClassAccessorDecoratorResult<E, V> => {
    return {
      get() {
        return accessor.get.call(this);
      },
      set(value: V) {
        const prevValue = accessor.get.call(this);

        accessor.set.call(this, value);

        this.requestUpdate();
        this.lifecycle.dispatchEvent(
          new ElementStateDidChangeEvent(
            context.name as string,
            prevValue,
            value,
          ),
        );
      },
    };
  };
}
