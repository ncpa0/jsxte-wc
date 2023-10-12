export class SlotAttributeChangeEvent extends CustomEvent<{
  node: WcSlot;
}> {
  constructor(node: WcSlot) {
    super("slotattributechange", {
      bubbles: true,
      cancelable: true,
      detail: { node },
    });
  }
}

export class SlotContentChangeEvent extends CustomEvent<{
  node: WcSlot;
}> {
  constructor(node: WcSlot) {
    super("slotcontentchange", {
      bubbles: true,
      cancelable: true,
      detail: { node },
    });
  }
}

export class WcSlot extends HTMLElement {
  _isWcSlot = true;
  public static isSlot(elem: Element | Node): elem is WcSlot {
    return (elem as WcSlot)._isWcSlot === true;
  }

  private _observer = new MutationObserver((a) =>
    this._handleObserverEvent(a),
  );

  public emitter = new EventTarget();

  constructor() {
    super();
  }

  private _handleObserverEvent(mutations: MutationRecord[]) {
    let hasContentChanged = false;
    let hasAttributeChanged = false;

    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i]!;
      if (mutation.type === "childList") {
        hasContentChanged = true;
      } else if (mutation.type === "attributes") {
        hasAttributeChanged = true;
      }
    }

    if (hasAttributeChanged) {
      this.emitter.dispatchEvent(new SlotAttributeChangeEvent(this));
    }
    if (hasContentChanged) {
      this.emitter.dispatchEvent(new SlotContentChangeEvent(this));
    }
  }

  public connectedCallback() {
    this.style.display = "none";
    this._observer.observe(this, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  public disconnectedCallback(): void {
    this._observer.disconnect();
  }
}
