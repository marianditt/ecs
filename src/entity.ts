export type EntityId = string;

export type Entity<T, K extends keyof T> = { [P in K]: T[P] };
