# JSXTE-WC

Library for building web components with JSX.

1. [Basic Usage](#basic-usage)
2. [Web Component State](#web-component-state)
3. [Web Component Attributes](#web-component-attributes)
4. [Lifecycle](#lifecycle)
5. [Refs](#refs)
6. [Other](#other)
7. [How does it work?](#how-does-it-work)

### Installation

```bash
npm install jsxte jsxte-wc
```

or

```bash
yarn add jsxte jsxte-wc
```

## Basic Usage

First set the JSX import source in the `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "jsxte"
  }
}
```

> Note: do not enable the `experimentalDecorators` compiler option, JSXTE-WC leverages the ECMAScript decorators instead of the legacy TypeScript decorators.

Define a class component that extends the `Element` class, and include a `render` method.

```tsx
import { Element, CustomElement } from "jsxte-wc";

@CustomElement("my-custom-element")
class MyCustomElement extends Element {
  render() {
    return (
      <div class="container">
        <span>Hello World!</span>
      </div>
    );
  }
}
```

Then use it:

```html
<body>
  <my-custom-element></my-custom-element>
</body>
```

## Web Component State

State are private properties of the component, that when changed will trigger a re-render of the component. To use it define an accessor on the component class and decorate it with the `State` decorator.

```tsx
import { Element, CustomElement, State } from "jsxte-wc";

@CustomElement("my-custom-element")
class MyCustomElement extends Element {
  @State()
  accessor count = 0;

  handleClick = () => {
    this.count++;
  };

  render() {
    return (
      <button onclick={this.handleClick}>
        Click count: {this.count}
      </button>
    );
  }
}
```

## Web Component Attributes

Attributes are public properties of the component, all attributes are reflected on the html declaration of the element, that when changed will trigger a re-render of the component. To use it define a property on the component class and decorate it with the `Attribute` decorator.

```tsx
import { Element, CustomElement, Attribute } from "jsxte-wc";

@CustomElement("my-custom-element")
class MyCustomElement extends Element {
  @Attribute()
  accessor value = "";

  handleInput = (event) => {
    const { value: newValue } = event.target;

    this.value = newValue;
  };

  render() {
    return (
      <input
        type="text"
        value={this.value}
        oninput={this.handleInput}
      />
    );
  }
}
```

Attribute then can be specified in the html:

```html
<body>
  <my-custom-element value="Hello World!"></my-custom-element>
</body>
```

## Lifecycle

There are a number of lifecycle events web components built with JSXTE-WC have:

- `ElementWillUpdateEvent`
- `ElementDidUpdateEvent`
- `ElementDidMountEvent`
- `ElementStateDidChangeEvent`
- `ElementAttributeDidChangeEvent`

Each of those events can be listened to by using the `lifecycle` property on the component class.

```tsx
import {
  Element,
  CustomElement,
  ElementLifecycleEvent,
} from "jsxte-wc";

@CustomElement("my-custom-element")
class MyCustomElement extends Element {
  constructor() {
    super();

    this.lifecycle.once(ElementLifecycleEvent.DidMount, () => {
      console.log("The first render cycle has completed.");
    });
  }

  render() {
    return (
      <div class="container">
        <span>Hello World!</span>
      </div>
    );
  }
}
```

### ElementWillUpdateEvent

This event is dispatched right before the component `render` method is called.
This event contains no additional details.

### ElementDidUpdateEvent

This event is dispatched right after the component `render` method is called and the results are applied to the document DOM.
This event contains no additional details.

### ElementDidMountEvent

This event is dispatched only once, right after the first render cycle of the component.
This event contains no additional details.

### ElementStateDidChangeEvent

This event is dispatcher right after a state property of the component is changed.
This event contains additional details with the following signature:

```ts
const details: {
  stateName: string;
  prevValue: unknown;
  newValue: unknown;
};
```

### ElementAttributeDidChangeEvent

This event is dispatcher right after an attribute property of the component is changed.
This event contains additional details with the following signature:

```ts
const details: {
  attributeName: string;
  prevValue: unknown;
  newValue: unknown;
};
```

## Refs

Ref object can be used to get reference to the actual DOM elements that are rendered by the component. After the component is rendered for the first time, the ref object will be updated with related element.

```tsx
import {
  Element,
  CustomElement,
  ElementLifecycleEvent,
} from "jsxte-wc";

@CustomElement("my-custom-element")
class MyCustomElement extends Element {
  innerSpan = { current: null };

  constructor() {
    super();

    this.lifecycle.once(ElementLifecycleEvent.DidMount, () => {
      this.applySpanStyles();
    });
  }

  applySpanStyles() {
    if (this.innerSpan.current) {
      const elem = this.innerSpan.current;
      elem.style.color = "red";
    }
  }

  render() {
    return (
      <div class="container">
        <span ref={this.innerSpan}>Hello World!</span>
      </div>
    );
  }
}
```

## Other

### requestUpdate() function

The `requestUpdate` function can be used to force a re-render of the component. This is also the function that is called internally whenever a state or attribute property is changed.

## How does it work?

JSXTE-WC on each render cycle produces a JSON structure of the component tree, then goes through it and compares it to the structure produced in the previous render cycle. Only the differences are used to update the DOM tree with the new attribute values and child nodes.
