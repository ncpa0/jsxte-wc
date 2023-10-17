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
    if (this.shouldEmitAttributeChangeEvent(mutations)) {
      this.emitter.dispatchEvent(new SlotAttributeChangeEvent(this));
    }
    if (this.shouldEmitContentChangeEvent(mutations)) {
      this.emitter.dispatchEvent(new SlotContentChangeEvent(this));
    }
  }

  protected shouldEmitAttributeChangeEvent(
    mutations: MutationRecord[],
  ): boolean {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i]!;
      if (
        mutation.type === "attributes" &&
        mutation.attributeName &&
        mutation.oldValue !==
          this.getAttribute(mutation.attributeName)
      ) {
        return true;
      }
    }
    return false;
  }

  protected shouldEmitContentChangeEvent(
    mutations: MutationRecord[],
  ): boolean {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i]!;
      if (
        mutation.type === "childList" ||
        mutation.type === "characterData"
      ) {
        return true;
      }
    }
    return false;
  }

  protected connectedCallback() {
    this.style.display = "none";
    this._observer.observe(this, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
      attributeOldValue: true,
    });
  }

  protected disconnectedCallback(): void {
    this._observer.disconnect();
  }
}
