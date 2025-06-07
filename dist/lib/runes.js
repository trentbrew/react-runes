'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ = void 0;
exports.state = state;
exports.derived = derived;
exports.effect = effect;
exports.useRune = useRune;
exports.untrack = untrack;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const react_1 = require("react");
// Global store for managing all runes
const useGlobalStore = (0, zustand_1.create)()((0, middleware_1.subscribeWithSelector)((set, get) => ({
    states: new Map(),
    deriveds: new Map(),
    effects: new Map(),
    subscribers: new Map(),
    updateState: (id, value) => {
        const store = get();
        const oldValue = store.states.get(id);
        if (oldValue === value)
            return;
        store.states.set(id, value);
        // Notify direct subscribers
        const subs = store.subscribers.get(id);
        if (subs) {
            subs.forEach((callback) => callback());
        }
        // Update deriveds that depend on this state
        store.deriveds.forEach((derived, derivedId) => {
            if (derived.deps.has(id)) {
                const newValue = derived.fn();
                if (newValue !== derived.value) {
                    derived.value = newValue;
                    const derivedSubs = store.subscribers.get(derivedId);
                    if (derivedSubs) {
                        derivedSubs.forEach((callback) => callback());
                    }
                }
            }
        });
        // Re-run effects that depend on this state
        store.effects.forEach((effect) => {
            if (effect.deps.has(id)) {
                if (effect.cleanup) {
                    effect.cleanup();
                }
                const cleanup = effect.fn();
                if (typeof cleanup === 'function') {
                    effect.cleanup = cleanup;
                }
            }
        });
    },
    subscribe: (id, callback) => {
        const store = get();
        if (!store.subscribers.has(id)) {
            store.subscribers.set(id, new Set());
        }
        store.subscribers.get(id).add(callback);
        return () => {
            const subs = store.subscribers.get(id);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    store.subscribers.delete(id);
                }
            }
        };
    },
})));
// Utility to generate unique IDs
let idCounter = 0;
const generateId = () => `rune_${++idCounter}`;
// Track current dependencies during derived/effect execution
let currentDeps = null;
// Utility: shallowEqual for arrays/objects
function shallowEqual(a, b) {
    if (Object.is(a, b))
        return true;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b)
        return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length)
        return false;
    for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(b, key) ||
            !Object.is(a[key], b[key]))
            return false;
    }
    return true;
}
// --- Batching mechanism ---
let pendingUpdates = new Set();
let batchScheduled = false;
function scheduleBatch(store) {
    if (!batchScheduled) {
        batchScheduled = true;
        queueMicrotask(() => {
            batchScheduled = false;
            const toNotify = Array.from(pendingUpdates);
            pendingUpdates.clear();
            // Notify direct subscribers
            toNotify.forEach((id) => {
                const subs = store.subscribers.get(id);
                if (subs)
                    subs.forEach((cb) => cb());
            });
            // Update deriveds and effects
            toNotify.forEach((id) => {
                store.deriveds.forEach((derived, derivedId) => {
                    if (derived.deps.has(id)) {
                        const newValue = derived.fn();
                        if (!Object.is(newValue, derived.value)) {
                            derived.value = newValue;
                            const derivedSubs = store.subscribers.get(derivedId);
                            if (derivedSubs)
                                derivedSubs.forEach((cb) => cb());
                        }
                    }
                });
                store.effects.forEach((effect) => {
                    if (effect.deps.has(id)) {
                        if (effect.cleanup)
                            effect.cleanup();
                        const cleanup = effect.fn();
                        if (typeof cleanup === 'function')
                            effect.cleanup = cleanup;
                    }
                });
            });
        });
    }
}
// State rune implementation
function state(initial, equals = Object.is) {
    const id = generateId();
    const store = useGlobalStore.getState();
    // Initialize state
    store.states.set(id, initial);
    // Store equality function
    if (!('stateEquals' in store))
        store.stateEquals = new Map();
    store.stateEquals.set(id, equals);
    return {
        id,
        get value() {
            // Track dependency if we're inside a derived/effect
            if (currentDeps) {
                currentDeps.add(id);
            }
            return store.states.get(id);
        },
        set value(newValue) {
            const oldValue = store.states.get(id);
            const eq = store.stateEquals.get(id) ||
                Object.is;
            if (eq(oldValue, newValue))
                return;
            store.states.set(id, newValue);
            pendingUpdates.add(id);
            scheduleBatch(store);
        },
    };
}
// Derived rune implementation
function derived(fn) {
    const id = generateId();
    const store = useGlobalStore.getState();
    const deps = new Set();
    // Execute function to capture dependencies
    currentDeps = deps;
    const initialValue = fn();
    currentDeps = null;
    // Store the derived
    store.deriveds.set(id, { fn, value: initialValue, deps });
    return {
        id,
        get value() {
            // Track dependency if we're inside another derived/effect
            if (currentDeps) {
                currentDeps.add(id);
            }
            const derived = store.deriveds.get(id);
            return derived ? derived.value : initialValue;
        },
    };
}
// Effect rune implementation
function effect(fn) {
    const id = generateId();
    const store = useGlobalStore.getState();
    const deps = new Set();
    // Execute function to capture dependencies
    currentDeps = deps;
    const cleanup = fn();
    currentDeps = null;
    // Store the effect
    const cleanupFn = typeof cleanup === 'function' ? cleanup : undefined;
    store.effects.set(id, { fn, deps, cleanup: cleanupFn });
    // Return cleanup function
    return () => {
        const effect = store.effects.get(id);
        if (effect?.cleanup) {
            effect.cleanup();
        }
        store.effects.delete(id);
    };
}
// React hook to use runes in components
function useRune(rune) {
    const [, forceUpdate] = (0, react_1.useState)({});
    const store = useGlobalStore.getState();
    (0, react_1.useEffect)(() => {
        if (!rune)
            return;
        const unsubscribe = store.subscribe(rune.id, () => {
            forceUpdate({});
        });
        return unsubscribe;
    }, [rune?.id, store]);
    return rune?.value;
}
// Utility function to untrack dependencies
function untrack(fn) {
    const prevDeps = currentDeps;
    currentDeps = null;
    const result = fn();
    currentDeps = prevDeps;
    return result;
}
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
exports.$ = useRune;
exports.default = { state, derived, effect, useRune, $: exports.$ };
