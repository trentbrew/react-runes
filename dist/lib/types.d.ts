export interface GlobalRuneStore {
    states: Map<string, any>;
    deriveds: Map<string, {
        fn: () => any;
        value: any;
        deps: Set<string>;
    }>;
    effects: Map<string, {
        fn: () => void | (() => void);
        cleanup?: () => void;
        deps: Set<string>;
    }>;
    subscribers: Map<string, Set<() => void>>;
    updateState: (id: string, value: any) => void;
    subscribe: (id: string, callback: () => void) => () => void;
}
export interface StateRune<T> {
    id: string;
    get value(): T;
    set value(newValue: T);
}
export interface DerivedRune<T> {
    id: string;
    get value(): T;
}
export type Signal<T> = StateRune<T> | DerivedRune<T>;
