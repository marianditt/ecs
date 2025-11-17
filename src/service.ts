import { Entity, EntityId } from './entity';
import { Middleware } from './middleware';
import { Store } from './store';

export interface Service<T> {
  entities<K extends keyof T>(signature: readonly K[]): IterableIterator<Entity<T, K>>;
  entity<K extends keyof T>(entityId: EntityId, signature: readonly K[]): Entity<T, K> | undefined;
  value<K extends keyof T>(entityId: EntityId, componentKey: K): T[K] | undefined;
  patchEntity(entityId: EntityId, patch: Partial<T>): void;
  deleteEntity(entityId: EntityId): void;
}

export class ServiceImpl<T> implements Service<T> {
  private readonly middlewares: Middleware<T>[] = [];

  public constructor(private readonly store: Store<T>) {}

  public *entities<K extends keyof T>(signature: readonly K[]): IterableIterator<Entity<T, K>> {
    const firstComponentKey: K | undefined = signature[0];
    if (firstComponentKey === undefined) {
      return;
    }

    for (const entityId of this.store.entityIds(firstComponentKey)) {
      const entity: Entity<T, K> | undefined = this.entity(entityId, signature);
      if (entity !== undefined) {
        yield entity;
      }
    }
  }

  public entity<K extends keyof T>(entityId: EntityId, signature: readonly K[]): Entity<T, K> | undefined {
    const entity: Entity<T, K> = {} as Entity<T, K>;
    for (const componentKey of signature) {
      const value: T[K] | undefined = this.store.value(entityId, componentKey);
      if (value === undefined) {
        return undefined;
      }
      entity[componentKey] = value;
    }
    return entity;
  }

  public value<K extends keyof T>(entityId: EntityId, componentKey: K): T[K] | undefined {
    return this.store.value(entityId, componentKey);
  }

  public patchEntity(entityId: EntityId, patch: Partial<T>): void {
    for (const componentKey in patch) {
      const value: T[typeof componentKey] | undefined = patch[componentKey];
      if (value === undefined) {
        this.deleteValue(entityId, componentKey);
      } else {
        this.setValue(entityId, componentKey, value);
      }
    }
  }

  public deleteEntity(entityId: EntityId): void {
    for (const componentKey of this.store.signature(entityId)) {
      this.deleteValue(entityId, componentKey);
    }
  }

  public use(middleware: Middleware<T>): void {
    this.middlewares.push(middleware);
  }

  public commit(): void {
    for (const middleware of this.middlewares) {
      middleware.commit();
    }
  }

  public revert(): void {
    for (const middleware of this.middlewares) {
      middleware.revert();
    }
  }

  private setValue<K extends keyof T>(entityId: EntityId, componentKey: K, value: T[K]): void {
    for (const middleware of this.middlewares) {
      middleware.setValue(entityId, componentKey, value);
    }
    this.store.setValue(entityId, componentKey, value);
  }

  private deleteValue<K extends keyof T>(entityId: EntityId, componentKey: K): void {
    for (const middleware of this.middlewares) {
      middleware.deleteValue(entityId, componentKey);
    }
    this.store.deleteValue(entityId, componentKey);
  }
}
