import { Element as CustomElement } from "./element";
import {
  ElementLifecycleEvent,
  ElementSlotDidChangeEvent,
} from "./element-events";
import { WcSlot } from "./slot";

export type SlotChanges = {
  added: WcSlot[];
  removed: WcSlot[];
  updated: WcSlot[];
};

export type OnSlotChangeCallback = (changes: SlotChanges) => void;

export type SlottedOptions = {
  filter?: string | ((elem: WcSlot) => boolean);
};

export function Slotted(opts: SlottedOptions = {}) {
  return <E extends CustomElement, S extends WcSlot>(
    accessor: ClassAccessorDecoratorTarget<E, S[]>,
    context: ClassAccessorDecoratorContext<E, S[]>,
  ): ClassAccessorDecoratorResult<E, S[]> => {
    const { filter } = opts;

    let matches: (element: S) => boolean = () => true;
    switch (typeof filter) {
      case "string":
        if (filter[0] === ".") {
          matches = (element) => {
            return element.classList.contains(filter!.substring(1));
          };
        } else if (filter[0] === "#") {
          matches = (element) => {
            return element.id === filter!.substring(1);
          };
        } else {
          matches = (element) => {
            return (
              element.tagName.toLowerCase() === filter!.toLowerCase()
            );
          };
        }
        break;
      case "function":
        matches = filter;
        break;
    }

    const removeSlots = (elem: E, slotsToRemove: S[]) => {
      let slots = accessor.get.call(elem);
      const prevLength = slots.length;

      slots = slots.filter((slot) => {
        return !slotsToRemove.includes(slot);
      });

      accessor.set.call(elem, slots);

      return prevLength !== slots.length;
    };

    const addSlots = (elem: E, slotsToAdd: S[]) => {
      let slots = accessor.get.call(elem).slice();
      const prevLength = slots.length;

      for (const slot of slotsToAdd) {
        const isMatching = matches(slot);
        if (isMatching) {
          slots.push(slot);
        }
      }

      accessor.set.call(elem, slots);

      return prevLength !== slots.length;
    };

    const updateSlots = (elem: E, updatedSlots: S[]) => {
      let slots = accessor.get.call(elem);
      let hasChanged = false;

      for (const slot of updatedSlots) {
        if (matches(slot)) {
          if (!slots.includes(slot)) {
            addSlots(elem, [slot]);
            hasChanged = true;
          }
        } else {
          if (slots.includes(slot)) {
            removeSlots(elem, [slot]);
            hasChanged = true;
          }
        }
      }

      return hasChanged;
    };

    context.addInitializer(function () {
      this.observeSlots((changes) => {
        const hasRemoved = removeSlots(this, changes.removed as S[]);
        const hasAdded = addSlots(this, changes.added as S[]);
        const hasUpdated = updateSlots(this, changes.updated as S[]);

        if (hasRemoved || hasAdded || hasUpdated) {
          this.requestUpdate();
          this.lifecycle.dispatchEvent(
            new ElementSlotDidChangeEvent(context.name as string),
          );
        }
      });

      this.lifecycle.once(ElementLifecycleEvent.DidMount, () => {
        const initValues = Array.from(this.children).filter(
          (elem): elem is S => {
            return WcSlot.isSlot(elem) && matches(elem as S);
          },
        );

        accessor.set.call(this, initValues);

        this.requestUpdate();
        this.lifecycle.dispatchEvent(
          new ElementSlotDidChangeEvent(context.name as string),
        );
      });
    });

    return {
      set() {},
      get() {
        return accessor.get.call(this);
      },
      init() {
        return [];
      },
    };
  };
}
