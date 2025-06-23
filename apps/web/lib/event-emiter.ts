type Listener<T> = (data: T) => void;

export class EventEmitter<Events extends Record<string, unknown>> {
  private events: {
    [K in keyof Events]?: Listener<Events[K]>[];
  } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event]!.push(listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const listeners = this.events[event];
    if (listeners) {
      this.events[event] = listeners.filter((l) => l !== listener);
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.events[event];
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }
}
