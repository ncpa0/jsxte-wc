export enum ElementLifecycleEvent {
  WillUpdate = "element-will-update",
  DidUpdate = "element-did-update",
  DidMount = "element-did-mount",
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

export class ElementDidMountEvent extends CustomEvent<
  HTMLElement | Text
> {
  declare type: ElementLifecycleEvent.DidMount;

  constructor(elem: HTMLElement | Text) {
    super(ElementLifecycleEvent.DidMount, { detail: elem });
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
  | ElementDidMountEvent
  | ElementStateDidChangeEvent
  | ElementAttributeDidChangeEvent;
