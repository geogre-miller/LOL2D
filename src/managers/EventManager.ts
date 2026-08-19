// source: https://github.com/behnammodi/jetemit/blob/master/src/index.js

// Callers subscribe with any concrete arg shape (e.g. `(hit: BasicAttackHit) => void`).
// Storage has to erase that per-event-type variety to one common, non-`any` shape.
type Callback = (...args: never[]) => unknown;

export default class EventManager {
  subscribers = new Map<string, Callback[]>();

  on<T extends unknown[]>(eventType: string, callback: (...args: T) => unknown): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    const stored = callback as unknown as Callback;
    this.subscribers.get(eventType)!.push(stored);
    return () => this.unsub(eventType, stored);
  }

  once<T extends unknown[]>(eventType: string, callback: (...args: T) => unknown): () => void {
    const unsub = this.on(eventType, (...args: T) => {
      callback(...args);
      unsub();
    });
    return unsub;
  }

  emit(eventType: string, arg?: any): any[] {
    const refunds: any[] = [];
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType)!.forEach(func => {
        if (func) refunds.push(func(arg as never));
      });
    }
    return refunds;
  }

  unsub(eventType: string, callback?: Callback): boolean {
    if (callback) {
      const subscribers = this.subscribers.get(eventType);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
          return true;
        }
      }
    } else if (this.subscribers.has(eventType)) {
      this.subscribers.delete(eventType);
      return true;
    }
    return false;
  }
}
