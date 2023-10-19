import { ArrayMap } from "../utils/array-map";
import { Element } from "./element";
import { ElementAttributeDidChangeEvent } from "./element-events";

export class Attribute<V> {
  private current = null as V | null;
  public onChange:
    | ((newValue: V | null, prevValue: V | null) => void)
    | null = null;
  public onSet: (() => void) | null = null;

  constructor(
    public readonly name: string,
    private readonly parser: (v: string | null) => V,
  ) {}

  public get() {
    return this.current;
  }

  public setInternal(v: V | null) {
    this.current = v;
  }

  public set(v: V | null) {
    const newValue = v;
    if (!Object.is(this.current, newValue)) {
      const prevValue = this.current;
      this.current = newValue;
      this.onChange?.(newValue, prevValue);
      this.onSet?.();
    }
  }

  public isEqualTo(v: V | null) {
    return Object.is(this.current, v);
  }

  public isEqualToRaw(v: string | null) {
    return Object.is(this.current, this.parser(v));
  }

  public syncDown(element: Element) {
    const v = element.getAttribute(this.name);
    const newValue = this.parser(v);
    if (!Object.is(this.current, newValue)) {
      const prevValue = this.current;
      this.current = newValue;
      this.onChange?.(newValue, prevValue);
    }
  }

  public syncUp(element: Element) {
    if (this.current === null) {
      element.removeAttribute(this.name);
    } else {
      element.setAttribute(this.name, String(this.current));
    }
  }
}

export class AttributeController {
  private readonly attributes = new ArrayMap<
    string,
    Attribute<any>
  >();

  constructor(private readonly element: Element) {}

  public registerAttribute(attribute: Attribute<any>) {
    this.attributes.set(attribute.name, attribute);
    this.element.observeAttribute(attribute.name);

    attribute.onChange = (newValue, prevValue) => {
      this.element.requestUpdate();
      this.element.lifecycle.dispatchEvent(
        new ElementAttributeDidChangeEvent(
          attribute.name,
          prevValue,
          newValue,
        ),
      );
    };

    attribute.onSet = () => {
      attribute.syncUp(this.element);
    };
  }

  public getAttribute(name: string) {
    return this.attributes.get(name);
  }

  public detectedPossibleChange(mutation: MutationRecord) {
    const attribute = this.attributes.get(mutation.attributeName!);

    if (attribute) {
      attribute.syncDown(this.element);
    }
  }

  public syncUpAll() {
    this.attributes.forEach((attribute) => {
      attribute.syncUp(this.element);
    });
  }
}
