import { EntityId } from './entity';
import { Middleware } from './middleware';
import { ServiceImpl } from './service';

export class HistoryMiddleware<T> implements Middleware<T> {
  private readonly history: ChangeSet<T>[] = [];
  private _changeCount: number = 0;
  private stage: ChangeSet<T> = new Map<EntityId, EntitySnapshot<T>>();

  public constructor(private readonly service: ServiceImpl<T>) {}

  public setValue<K extends keyof T>(entityId: EntityId, componentKey: K, value: T[K]): void {
    const snapshot: EntitySnapshot<T> = this.stage.get(entityId) ?? new EntitySnapshot<T>();
    const oldValue: T[K] | undefined = this.service.value(entityId, componentKey);
    snapshot.setValue(componentKey, value, oldValue);
    this.stage.set(entityId, snapshot);
  }

  public deleteValue<K extends keyof T>(entityId: EntityId, componentKey: K): void {
    const snapshot: EntitySnapshot<T> = this.stage.get(entityId) ?? new EntitySnapshot<T>();
    const oldValue: T[K] | undefined = this.service.value(entityId, componentKey);
    snapshot.deleteValue(componentKey, oldValue);
    this.stage.set(entityId, snapshot);
  }

  public commit(): void {
    if (this.stage.size > 0) {
      this.history.splice(this._changeCount);
      this.history.push(this.stage);
      this._changeCount++;
      this.stage = new Map<EntityId, EntitySnapshot<T>>();
    }
  }

  public revert(): void {
    this.stage = new Map<EntityId, EntitySnapshot<T>>();
  }

  public changeCount(): number {
    return this._changeCount;
  }

  public historyLength(): number {
    return this.history.length;
  }

  public undo(): void {
    const changeSet: ChangeSet<T> | undefined = this.history[this._changeCount - 1];
    if (changeSet) {
      for (const [entityId, snapshot] of changeSet) {
        this.service.patchEntity(entityId, snapshot.backwardPatch());
      }
      this._changeCount--;
    }
  }

  public redo(): void {
    const changeSet: ChangeSet<T> | undefined = this.history[this._changeCount - 1];
    if (changeSet) {
      for (const [entityId, snapshot] of changeSet) {
        this.service.patchEntity(entityId, snapshot.forwardPatch());
      }
      this._changeCount++;
    }
  }
}

type ChangeSet<T> = Map<EntityId, EntitySnapshot<T>>;

class EntitySnapshot<T> {
  private readonly _forwardPatch: Partial<T> = {};
  private readonly _backwardPatch: Partial<T> = {};

  public forwardPatch(): Partial<T> {
    return this._forwardPatch;
  }

  public backwardPatch(): Partial<T> {
    return this._backwardPatch;
  }

  public setValue<K extends keyof T>(componentKey: K, newValue: T[K], oldValue: T[K] | undefined): void {
    this._forwardPatch[componentKey] = newValue;
    if (!(componentKey in this._backwardPatch)) {
      this._backwardPatch[componentKey] = oldValue;
    }
  }

  public deleteValue<K extends keyof T>(componentKey: K, oldValue: T[K] | undefined): void {
    this._forwardPatch[componentKey] = undefined;
    if (!(componentKey in this._backwardPatch)) {
      this._backwardPatch[componentKey] = oldValue;
    }
  }
}
