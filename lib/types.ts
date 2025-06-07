// Global store for managing all runes
export interface GlobalRuneStore {
  states: Map<string, any>;
  deriveds: Map<string, { fn: () => any; value: any; deps: Set<string> }>;
  effects: Map<
    string,
    { fn: () => void | (() => void); cleanup?: () => void; deps: Set<string> }
  >;
  subscribers: Map<string, Set<() => void>>;
  updateState: (id: string, value: any) => void;
  subscribe: (id: string, callback: () => void) => () => void;
}

// State rune interface
export interface StateRune<T> {
  id: string;
  get value(): T;
  set value(newValue: T);
}

// Derived rune interface
export interface DerivedRune<T> {
  id: string;
  get value(): T;
}

export type Signal<T> = StateRune<T> | DerivedRune<T>;
