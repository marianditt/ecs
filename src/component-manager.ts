export type EntityId = string;

export type ComponentManagerState<T> = {
  [K in keyof T]?: Map<EntityId, T[K]>;
};

export class ComponentManager<T> {
  private state: ComponentManagerState<T> = {};

  public getComponents<K extends keyof T>(component: K): ReadonlyMap<EntityId, T[K]> {
    return this.state[component] ?? new Map<EntityId, T[K]>();
  }

  public getEntityComponent<K extends keyof T>(entityId: EntityId, component: K): T[K] | undefined {
    const componentMap: Map<EntityId, T[K]> = this.state[component] ?? new Map<EntityId, T[K]>();
    return componentMap.get(entityId);
  }

  public setEntityComponent<K extends keyof T>(entityId: EntityId, component: K, value: T[K]): void {
    const componentMap: Map<EntityId, T[K]> = this.state[component] ?? new Map<EntityId, T[K]>();
    componentMap.set(entityId, value);
    this.state[component] = componentMap;
  }

  public removeEntityComponent<K extends keyof T>(entityId: EntityId, component: K): void {
    this.state[component]?.delete(entityId);
  }

  public removeEntity(entityId: EntityId): void {
    for (const component in this.state) {
      this.removeEntityComponent(entityId, component);
    }
  }
}
