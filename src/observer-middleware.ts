import { EntityId } from './entity';
import { Middleware } from './middleware';

export type Observer = () => void;

export interface Condition<T> {
  readonly entityId?: EntityId | undefined;
  readonly signature?: (keyof T)[] | undefined;
}

export class ObserverMiddleware<T> implements Middleware<T> {
  private readonly observers: Set<Observer> = new Set<Observer>();
  private readonly observedEntities: Map<Observer, EntityId> = new Map<Observer, EntityId>();
  private readonly observedSignatures: Map<Observer, Signature<T>> = new Map<Observer, Signature<T>>();
  private readonly signatures: Map<EntityId, Signature<T>> = new Map<EntityId, Signature<T>>();
  private readonly diffs: Map<EntityId, Diff<T>> = new Map<EntityId, Diff<T>>();

  public registerObserver(observer: Observer, topic: Condition<T>): void {
    if (topic.entityId !== undefined || topic.signature !== undefined) {
      this.observers.add(observer);
      if (topic.entityId !== undefined) {
        this.observedEntities.set(observer, topic.entityId);
      }
      if (topic.signature !== undefined) {
        this.observedSignatures.set(observer, new Signature<T>(topic.signature));
      }
    }
  }

  public unregisterObserver(observer: Observer): void {
    this.observers.delete(observer);
    this.observedEntities.delete(observer);
    this.observedSignatures.delete(observer);
  }

  setValue<K extends keyof T>(entityId: EntityId, componentKey: K): void {
    const diff: Diff<T> = this.diffs.get(entityId) ?? new Diff<T>();
    this.diffs.set(entityId, diff);
  }

  deleteValue<K extends keyof T>(entityId: EntityId, componentKey: K): void {
    const diff: Diff<T> = this.diffs.get(entityId) ?? new Diff<T>();
    diff.delete(componentKey);
    this.diffs.set(entityId, diff);
  }

  commit(): void {
    for (const [entityId, diff] of this.diffs) {
      const signature: Signature<T> = this.signatures.get(entityId) ?? new Signature<T>([]);
      signature.addAll(diff.added());
      this.signatures.set(entityId, signature);
    }

    for (const observer of this.observers) {
      const observedEntity: EntityId | undefined = this.observedEntities.get(observer);
      const observedSignature: Signature<T> | undefined = this.observedSignatures.get(observer);
      if (observedEntity !== undefined) {
        const entitySignature: Signature<T> | undefined = this.signatures.get(observedEntity);
        const diff: Diff<T> | undefined = this.diffs.get(observedEntity);
        if (diff === undefined || entitySignature === undefined) continue;
        if (
          observedSignature === undefined ||
          (diff.hasOverlap(observedSignature) && entitySignature.contains(observedSignature))
        ) {
          observer();
        }
      } else if (observedSignature !== undefined) {
        for (const [entityId, diff] of this.diffs) {
          const entitySignature: Signature<T> | undefined = this.signatures.get(entityId);
          if (entitySignature === undefined) continue;
          if (diff.hasOverlap(observedSignature) && entitySignature.contains(observedSignature)) {
            observer();
            break;
          }
        }
      }
    }

    for (const [entityId, diff] of this.diffs) {
      const signature: Signature<T> = this.signatures.get(entityId) ?? new Signature<T>([]);
      signature.deleteAll(diff.deleted());
      this.signatures.set(entityId, signature);
    }
    this.diffs.clear();
  }

  public revert(): void {
    this.diffs.clear();
  }
}

class Signature<T> {
  private readonly components: Set<keyof T>;

  public constructor(components: readonly (keyof T)[]) {
    this.components = new Set<keyof T>(components);
  }

  public [Symbol.iterator](): IterableIterator<keyof T> {
    return this.components.values();
  }

  public add(componentKey: keyof T): void {
    this.components.add(componentKey);
  }

  public addAll(other: Signature<T>): void {
    for (const componentKey of other.components) {
      this.components.add(componentKey);
    }
  }

  public delete(componentKey: keyof T): void {
    this.components.delete(componentKey);
  }

  public deleteAll(other: Signature<T>): void {
    for (const componentKey of other.components) {
      this.components.delete(componentKey);
    }
  }

  public contains(other: Signature<T>): boolean {
    for (const key of other.components) {
      if (!this.components.has(key)) {
        return false;
      }
    }
    return true;
  }

  public hasOverlap(other: Signature<T>): boolean {
    for (const key of other.components) {
      if (this.components.has(key)) {
        return true;
      }
    }
    return false;
  }
}

class Diff<T> {
  private readonly _added: Signature<T> = new Signature<T>([]);
  private readonly _deleted: Signature<T> = new Signature<T>([]);

  public add(componentKey: keyof T): void {
    this._added.add(componentKey);
    this._deleted.delete(componentKey);
  }

  public delete(componentKey: keyof T): void {
    this._deleted.add(componentKey);
    this._added.delete(componentKey);
  }

  public hasOverlap(other: Signature<T>): boolean {
    return this._added.hasOverlap(other) || this._deleted.hasOverlap(other);
  }

  public added(): Signature<T> {
    return this._added;
  }

  public deleted(): Signature<T> {
    return this._deleted;
  }
}
