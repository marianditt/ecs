import { EntityId } from './entity';

export interface Middleware<T> {
  setValue<K extends keyof T>(entityId: EntityId, componentKey: K, value: T[K]): void;
  deleteValue<K extends keyof T>(entityId: EntityId, componentKey: K): void;
  commit(): void;
  revert(): void;
}
