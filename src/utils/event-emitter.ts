import {
  AllElementLifecycleEvents,
  ElementLifecycleEvent,
} from "../element/element-events";

type EventFor<EventType extends ElementLifecycleEvent> = Extract<
  AllElementLifecycleEvents,
  { type: EventType }
>;

export class EventEmitter extends (EventTarget as any) {
  once<EventType extends ElementLifecycleEvent>(
    type: EventType,
    listener: (evt: EventFor<EventType>) => void,
    capture?: boolean,
  ) {
    super.addEventListener(type, listener as any, {
      once: true,
      capture,
    });
  }

  on<EventType extends ElementLifecycleEvent>(
    type: EventType,
    listener: (evt: EventFor<EventType>) => void,
    capture?: boolean,
  ): void {
    super.addEventListener(type, listener as any, {
      capture,
    });
  }

  off<EventType extends ElementLifecycleEvent>(
    type: EventType,
    listener: (evt: EventFor<EventType>) => void,
  ): void {
    super.removeEventListener(type, listener as any);
  }

  addEventListener<EventType extends ElementLifecycleEvent>(
    type: EventType,
    listener: (evt: EventFor<EventType>) => void,
    capture?: boolean,
  ): void {
    super.addEventListener(type, listener as any, {
      capture,
    });
  }

  removeEventListener<EventType extends ElementLifecycleEvent>(
    type: EventType,
    listener: (evt: EventFor<EventType>) => void,
  ): void {
    super.removeEventListener(type, listener as any);
  }

  dispatchEvent<EventType extends ElementLifecycleEvent>(
    event: EventFor<EventType>,
  ): boolean {
    return super.dispatchEvent(event);
  }
}
