import { EntityId } from './entity';

export class Store<T> {
  private readonly state: { [K in keyof T]?: Map<EntityId, T[K]> } = {};

  public *entityIds(componentKey: keyof T): IterableIterator<EntityId> {
    yield* this.state[componentKey]?.keys() ?? [];
  }

  public *signature(entityId: EntityId): IterableIterator<keyof T> {
    for (const componentKey in this.state) {
      if (this.state[componentKey]?.has(entityId) ?? false) {
        yield componentKey;
      }
    }
  }

  public value<K extends keyof T>(entityId: EntityId, componentKey: K): T[K] | undefined {
    return this.state[componentKey]?.get(entityId);
  }

  public setValue<K extends keyof T>(entityId: EntityId, componentKey: K, value: T[K]): void {
    const componentMap: Map<EntityId, T[K]> = this.state[componentKey] ?? new Map<EntityId, T[K]>();
    componentMap.set(entityId, value);
    this.state[componentKey] = componentMap;
  }

  public deleteValue<K extends keyof T>(entityId: EntityId, componentKey: K): void {
    this.state[componentKey]?.delete(entityId);
  }
}
