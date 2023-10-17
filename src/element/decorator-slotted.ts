import { Element as CustomElement } from "./element";
import {
  ElementLifecycleEvent,
  ElementSlotDidChangeEvent,
} from "./element-events";
import { WcSlot } from "./slot";

export type SlotChanges = {
  /**
   * List of direct children of the custom element.
   */
  readonly added: ReadonlyArray<WcSlot>;
  /**
   * List of children that were removed from the custom element.
   */
  readonly removed: ReadonlyArray<WcSlot>;
  /**
   * List of direct children of the custom element which content has
   * changed.
   */
  readonly contentChanged: ReadonlyArray<WcSlot>;
  /**
   * List of direct children of the custom element which attributes
   * have changed.
   */
  readonly attributeChanged: ReadonlyArray<WcSlot>;
};

export type FinalChanges = SlotChanges;

export type OnSlotChangeCallback = (changes: SlotChanges) => void;

export type SlottedOptions = {
  filter?: string | ((elem: WcSlot) => boolean);
  /**
   * Callback that allows to decide whether the custom element should
   * re-render on given slot changes.
   */
  shouldRequestUpdate?: (
    current: WcSlot[],
    changes: SlotChanges,
  ) => boolean;
};

const defaultShouldUpdate = <S extends WcSlot>(
  current: S[],
  changes: FinalChanges,
): boolean => {
  return (
    changes.added.length > 0 ||
    changes.removed.length > 0 ||
    changes.contentChanged.length > 0 ||
    changes.attributeChanged.length > 0
  );
};

export function Slotted(opts: SlottedOptions = {}) {
  return <E extends CustomElement, S extends WcSlot>(
    accessor: ClassAccessorDecoratorTarget<E, S[]>,
    context: ClassAccessorDecoratorContext<E, S[]>,
  ): ClassAccessorDecoratorResult<E, S[]> => {
    const { filter: optFilter } = opts;

    let filter: (element: WcSlot) => boolean = () => true;
    switch (typeof optFilter) {
      case "string":
        filter = (elem) => elem.matches(optFilter);
        break;
      case "function":
        filter = optFilter;
        break;
    }

    const { shouldRequestUpdate = defaultShouldUpdate } = opts;

    const updateSlots = (elem: E, changes: SlotChanges) => {
      let current = accessor.get.call(elem).slice();

      const shouldAdd = changes.added.filter(filter);
      const shouldRemove = changes.removed;

      const added: WcSlot[] = [];
      const removed: WcSlot[] = [];
      const contentChanged: WcSlot[] = [];
      const attributeChanged: WcSlot[] = [];

      for (let i = 0; i < changes.attributeChanged.length; i++) {
        const slot = changes.attributeChanged[i] as S;
        if (filter(slot)) {
          const idx = current.indexOf(slot);
          if (idx === -1) {
            current.push(slot);
            added.push(slot);
          } else {
            attributeChanged.push(slot);
          }
        } else {
          const idx = current.indexOf(shouldRemove[i] as S);
          if (idx !== -1) {
            current.splice(idx, 1);
            removed.push(slot);
          }
        }
      }

      for (let i = 0; i < changes.contentChanged.length; i++) {
        const slot = changes.contentChanged[i] as S;
        if (filter(slot)) {
          const idx = current.indexOf(slot);
          if (idx === -1) {
            current.push(slot);
            added.push(slot);
          } else {
            contentChanged.push(slot);
          }
        } else {
          const idx = current.indexOf(shouldRemove[i] as S);
          if (idx !== -1) {
            current.splice(idx, 1);
            removed.push(slot);
          }
        }
      }

      for (let i = 0; i < shouldRemove.length; i++) {
        const idx = current.indexOf(shouldRemove[i] as S);
        if (idx !== -1) {
          current.splice(idx, 1);
          removed.push(shouldRemove[i] as S);
        }
      }

      for (let i = 0; i < shouldAdd.length; i++) {
        const slot = shouldAdd[i] as S;
        const idx = current.indexOf(slot);
        if (idx === -1) {
          current.push(slot);
          added.push(slot);
        }
      }

      accessor.set.call(elem, current);

      const finalChanges: FinalChanges = {
        added,
        removed,
        contentChanged,
        attributeChanged,
      };

      return finalChanges;
    };

    context.addInitializer(function () {
      this.observeSlots((changes) => {
        const finalChanges = updateSlots(this, changes);

        if (
          shouldRequestUpdate(accessor.get.call(this), finalChanges)
        ) {
          this.requestUpdate();
        }

        this.lifecycle.dispatchEvent(
          new ElementSlotDidChangeEvent(
            context.name as string,
            finalChanges,
          ),
        );
      });

      this.lifecycle.once(ElementLifecycleEvent.DidMount, () => {
        const children = Array.from(this.children);

        const initValue: S[] = [];
        for (let i = 0; i < children.length; i++) {
          const elem = children[i]!;

          if (WcSlot.isSlot(elem) && filter(elem as S)) {
            initValue.push(elem as S);
            this.connectToWcSlot(elem);
          }
        }

        accessor.set.call(this, initValue);

        const finalChanges: FinalChanges = {
          added: initValue,
          attributeChanged: [],
          contentChanged: [],
          removed: [],
        };

        if (
          shouldRequestUpdate(accessor.get.call(this), finalChanges)
        ) {
          this.requestUpdate();
        }

        this.lifecycle.dispatchEvent(
          new ElementSlotDidChangeEvent(
            context.name as string,
            finalChanges,
          ),
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
