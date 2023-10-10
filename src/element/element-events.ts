export enum ElementLifecycleEvent {
  WillUpdate = "element-will-update",
  DidUpdate = "element-did-update",
  WillMount = "element-will-mount",
  DidMount = "element-did-mount",
  SlotDidChange = "element-slot-did-change",
  StateDidChange = "element-state-did-change",
  AttributeDidChange = "element-attribute-did-change",
}

export class ElementWillUpdateEvent extends CustomEvent<undefined> {
  declare type: ElementLifecycleEvent.WillUpdate;

  constructor() {
    super(ElementLifecycleEvent.WillUpdate);
  }
}

export class ElementDidUpdateEvent extends CustomEvent<undefined> {
  declare type: ElementLifecycleEvent.DidUpdate;

  constructor() {
    super(ElementLifecycleEvent.DidUpdate);
  }
}

export class ElementWillMountEvent extends CustomEvent<undefined> {
  declare type: ElementLifecycleEvent.WillMount;

  constructor() {
    super(ElementLifecycleEvent.WillMount);
  }
}

export class ElementDidMountEvent extends CustomEvent<undefined> {
  declare type: ElementLifecycleEvent.DidMount;

  constructor() {
    super(ElementLifecycleEvent.DidMount);
  }
}

export class ElementSlotDidChangeEvent extends CustomEvent<{
  slotName: string;
}> {
  declare type: ElementLifecycleEvent.SlotDidChange;

  constructor(slotName: string) {
    super(ElementLifecycleEvent.SlotDidChange, {
      detail: {
        slotName,
      },
    });
  }
}

export class ElementStateDidChangeEvent extends CustomEvent<{
  stateName: string;
  prevValue: unknown;
  newValue: unknown;
}> {
  declare type: ElementLifecycleEvent.StateDidChange;

  constructor(
    stateName: string,
    prevValue: unknown,
    newValue: unknown,
  ) {
    super(ElementLifecycleEvent.StateDidChange, {
      detail: {
        stateName,
        prevValue,
        newValue,
      },
    });
  }
}

export class ElementAttributeDidChangeEvent extends CustomEvent<{
  attributeName: string;
  prevValue: unknown;
  newValue: unknown;
}> {
  declare type: ElementLifecycleEvent.AttributeDidChange;

  constructor(
    attributeName: string,
    prevValue: unknown,
    newValue: unknown,
  ) {
    super(ElementLifecycleEvent.AttributeDidChange, {
      detail: {
        attributeName,
        prevValue,
        newValue,
      },
    });
  }
}

export type AllElementLifecycleEvents =
  | ElementWillUpdateEvent
  | ElementDidUpdateEvent
  | ElementWillMountEvent
  | ElementDidMountEvent
  | ElementSlotDidChangeEvent
  | ElementStateDidChangeEvent
  | ElementAttributeDidChangeEvent;
