import { StateRune, DerivedRune } from './types';
export declare function state<T>(initial: T, equals?: (a: T, b: T) => boolean): StateRune<T>;
export declare function derived<T>(fn: () => T): DerivedRune<T>;
export declare function effect(fn: () => void | (() => void)): () => void;
export declare function useRune<T>(rune: StateRune<T> | DerivedRune<T> | undefined): T | undefined;
export declare function untrack<T>(fn: () => T): T;
/**
 * React hook for subscribing to rune state/derived values.
 *
 * Svelte-inspired: Use `$` to get a reactive value from a rune (state or derived).
 * When used in a React component, the component will re-render when the rune changes.
 *
 * Example:
 *   const count = $(countRune)
 *   const todos = $(todosRune)
 *
 * @param rune The state or derived rune to subscribe to
 * @returns The current value of the rune, reactively updating the component
 */
export declare const $: typeof useRune;
declare const _default: {
    state: typeof state;
    derived: typeof derived;
    effect: typeof effect;
    useRune: typeof useRune;
    $: typeof useRune;
};
export default _default;
