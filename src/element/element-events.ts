export enum CustomElementEvent {
  WillUpdate = "element-will-update",
  DidUpdate = "element-did-update",
  DidMount = "element-did-mount",
  StateDidChange = "element-state-did-change",
  AttributeDidChange = "element-attribute-did-change",
}

export class ElementWillUpdateEvent extends CustomEvent<undefined> {
  declare type: CustomElementEvent.WillUpdate;

  constructor() {
    super(CustomElementEvent.WillUpdate);
  }
}

export class ElementDidUpdateEvent extends CustomEvent<undefined> {
  declare type: CustomElementEvent.DidUpdate;

  constructor() {
    super(CustomElementEvent.DidUpdate);
  }
}

export class ElementDidMountEvent extends CustomEvent<
  HTMLElement | Text
> {
  declare type: CustomElementEvent.DidMount;

  constructor(elem: HTMLElement | Text) {
    super(CustomElementEvent.DidMount, { detail: elem });
  }
}

export class ElementStateDidChangeEvent extends CustomEvent<{
  stateName: string;
  prevValue: any;
  newValue: any;
}> {
  declare type: CustomElementEvent.StateDidChange;

  constructor(stateName: string, prevValue: any, newValue: any) {
    super(CustomElementEvent.StateDidChange, {
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
  prevValue: any;
  newValue: any;
}> {
  declare type: CustomElementEvent.AttributeDidChange;

  constructor(attributeName: string, prevValue: any, newValue: any) {
    super(CustomElementEvent.AttributeDidChange, {
      detail: {
        attributeName,
        prevValue,
        newValue,
      },
    });
  }
}

export type CustomEvents =
  | ElementWillUpdateEvent
  | ElementDidUpdateEvent
  | ElementDidMountEvent
  | ElementStateDidChangeEvent
  | ElementAttributeDidChangeEvent;
