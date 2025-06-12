'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { GlobalRuneStore, StateRune, DerivedRune, Signal } from './types';

// Global store for managing all runes
const useGlobalStore = create<GlobalRuneStore>()(
  subscribeWithSelector((set, get) => ({
    states: new Map(),
    deriveds: new Map(),
    effects: new Map(),
    subscribers: new Map(),

    updateState: (id: string, value: any) => {
      const store = get();
      const oldValue = store.states.get(id);

      if (oldValue === value) return;

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

    subscribe: (id: string, callback: () => void) => {
      const store = get();
      if (!store.subscribers.has(id)) {
        store.subscribers.set(id, new Set());
      }
      store.subscribers.get(id)!.add(callback);

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
  })),
);

// Utility to generate unique IDs
let idCounter = 0;
const generateId = () => `rune_${++idCounter}`;

// Track current dependencies during derived/effect execution
let currentDeps: Set<string> | null = null;

// Utility: shallowEqual for arrays/objects
function shallowEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    )
      return false;
  }
  return true;
}

// --- Batching mechanism ---
let pendingUpdates = new Set<string>();
let batchScheduled = false;
function scheduleBatch(store: any) {
  if (!batchScheduled) {
    batchScheduled = true;
    queueMicrotask(() => {
      batchScheduled = false;
      const toNotify = Array.from(pendingUpdates);
      pendingUpdates.clear();
      // Notify direct subscribers
      toNotify.forEach((id: string) => {
        const subs = store.subscribers.get(id);
        if (subs) subs.forEach((cb: () => void) => cb());
      });
      // Update deriveds and effects
      toNotify.forEach((id: string) => {
        store.deriveds.forEach(
          (
            derived: { fn: () => any; value: any; deps: Set<string> },
            derivedId: string,
          ) => {
            if (derived.deps.has(id)) {
              const newValue = derived.fn();
              if (!Object.is(newValue, derived.value)) {
                derived.value = newValue;
                const derivedSubs = store.subscribers.get(derivedId);
                if (derivedSubs) derivedSubs.forEach((cb: () => void) => cb());
              }
            }
          },
        );
        store.effects.forEach(
          (effect: {
            fn: () => void | (() => void);
            cleanup?: () => void;
            deps: Set<string>;
          }) => {
            if (effect.deps.has(id)) {
              if (effect.cleanup) effect.cleanup();
              const cleanup = effect.fn();
              if (typeof cleanup === 'function') effect.cleanup = cleanup;
            }
          },
        );
      });
    });
  }
}

// State rune implementation
export function state<T>(
  initial: T,
  equals: (a: T, b: T) => boolean = Object.is,
): StateRune<T> {
  const id = generateId();
  const store = useGlobalStore.getState();

  // Initialize state
  store.states.set(id, initial);
  // Store equality function
  if (!('stateEquals' in store)) (store as any).stateEquals = new Map();
  (store as any).stateEquals.set(id, equals);

  return {
    id,
    get value(): T {
      // Track dependency if we're inside a derived/effect
      if (currentDeps) {
        currentDeps.add(id);
      }
      return store.states.get(id);
    },
    set value(newValue: T) {
      const oldValue = store.states.get(id);
      const eq =
        ((store as any).stateEquals.get(id) as (a: T, b: T) => boolean) ||
        Object.is;
      if (eq(oldValue, newValue)) return;
      store.states.set(id, newValue);
      pendingUpdates.add(id);
      scheduleBatch(store);
    },
  };
}

// Derived rune implementation
export function derived<T>(fn: () => T): DerivedRune<T> {
  const id = generateId();
  const store = useGlobalStore.getState();
  const deps = new Set<string>();

  // Execute function to capture dependencies
  currentDeps = deps;
  const initialValue = fn();
  currentDeps = null;

  // Store the derived
  store.deriveds.set(id, { fn, value: initialValue, deps });

  return {
    id,
    get value(): T {
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
export function effect(fn: () => void | (() => void)): () => void {
  const id = generateId();
  const store = useGlobalStore.getState();
  const deps = new Set<string>();

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
export function useRune<T>(
  rune: StateRune<T> | DerivedRune<T> | undefined,
): T | undefined {
  const [, forceUpdate] = useState({});
  const store = useGlobalStore.getState();

  useEffect(() => {
    if (!rune) return;
    const unsubscribe = store.subscribe(rune.id, () => {
      forceUpdate({});
    });
    return unsubscribe;
  }, [rune?.id, store]);

  return rune?.value;
}

// Utility function to untrack dependencies
export function untrack<T>(fn: () => T): T {
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
export const $ = useRune;

// $state rune implementation
export function $state<T>(
  initial: T,
  equals: (a: T, b: T) => boolean = Object.is,
): StateRune<T> {
  const id = generateId();
  const store = useGlobalStore.getState();

  // Initialize state
  store.states.set(id, initial);
  // Store equality function
  if (!('stateEquals' in store)) (store as any).stateEquals = new Map();
  (store as any).stateEquals.set(id, equals);

  const rune: StateRune<T> = {
    id,
    get value(): T {
      if (currentDeps) {
        currentDeps.add(id);
      }
      return store.states.get(id);
    },
    set value(newValue: T) {
      const oldValue = store.states.get(id);
      const eq =
        ((store as any).stateEquals.get(id) as (a: T, b: T) => boolean) ||
        Object.is;
      if (eq(oldValue, newValue)) return;
      store.states.set(id, newValue);
      pendingUpdates.add(id);
      scheduleBatch(store);
    },
  };

  // Proxy for automatic unwrapping
  return new Proxy(rune, {
    get(target: StateRune<T>, prop: PropertyKey, receiver: any) {
      if (prop === 'id' || prop === 'value' || prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      const value = target.value;
      if (value && typeof value === 'object') {
        return value[prop as keyof T];
      }
      // For primitives, allow valueOf/toString
      if (prop === Symbol.toPrimitive) {
        return (hint: string) => {
          if (hint === 'number') return Number(value);
          if (hint === 'string') return String(value);
          return value;
        };
      }
      return undefined;
    },
    set(target: StateRune<T>, prop: PropertyKey, value: any, receiver: any) {
      if (prop === 'value') {
        target.value = value;
        return true;
      }
      const current = target.value;
      if (current && typeof current === 'object') {
        (current as any)[prop] = value;
        // Trigger update
        target.value = current;
        return true;
      }
      return false;
    },
    has(target: StateRune<T>, prop: PropertyKey) {
      if (prop === 'id' || prop === 'value' || prop in target) return true;
      const value = target.value;
      return value && typeof value === 'object' ? prop in value : false;
    },
    ownKeys(target: StateRune<T>) {
      const value = target.value;
      return value && typeof value === 'object' ? Reflect.ownKeys(value) : [];
    },
    getOwnPropertyDescriptor(target: StateRune<T>, prop: PropertyKey) {
      if (prop === 'id' || prop === 'value' || prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      const value = target.value;
      if (prop === Symbol.toPrimitive) {
        return {
          configurable: true,
          enumerable: false,
          value: (hint: string) => {
            if (hint === 'number') return Number(value);
            if (hint === 'string') return String(value);
            return value;
          },
        };
      }
      return value && typeof value === 'object'
        ? Object.getOwnPropertyDescriptor(value, prop)
        : undefined;
    },
    getPrototypeOf(target: StateRune<T>) {
      const value = target.value;
      return value && typeof value === 'object'
        ? Object.getPrototypeOf(value)
        : Object.prototype;
    },
  }) as StateRune<T>;
}

// $derived rune implementation
export function $derived<T>(fn: () => T): DerivedRune<T> {
  const id = generateId();
  const store = useGlobalStore.getState();
  const deps = new Set<string>();

  // Execute function to capture dependencies
  currentDeps = deps;
  const initialValue = fn();
  currentDeps = null;

  // Store the derived
  store.deriveds.set(id, { fn, value: initialValue, deps });

  const rune: DerivedRune<T> = {
    id,
    get value(): T {
      if (currentDeps) {
        currentDeps.add(id);
      }
      const derived = store.deriveds.get(id);
      return derived ? derived.value : initialValue;
    },
  };

  // Proxy for automatic unwrapping
  return new Proxy(rune, {
    get(target: DerivedRune<T>, prop: PropertyKey, receiver: any) {
      if (prop === 'id' || prop === 'value' || prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      const value = target.value;
      if (value && typeof value === 'object') {
        return value[prop as keyof T];
      }
      if (prop === Symbol.toPrimitive) {
        return (hint: string) => {
          if (hint === 'number') return Number(value);
          if (hint === 'string') return String(value);
          return value;
        };
      }
      return undefined;
    },
    has(target: DerivedRune<T>, prop: PropertyKey) {
      if (prop === 'id' || prop === 'value' || prop in target) return true;
      const value = target.value;
      return value && typeof value === 'object' ? prop in value : false;
    },
    ownKeys(target: DerivedRune<T>) {
      const value = target.value;
      return value && typeof value === 'object' ? Reflect.ownKeys(value) : [];
    },
    getOwnPropertyDescriptor(target: DerivedRune<T>, prop: PropertyKey) {
      if (prop === 'id' || prop === 'value' || prop in target) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
      const value = target.value;
      if (prop === Symbol.toPrimitive) {
        return {
          configurable: true,
          enumerable: false,
          value: (hint: string) => {
            if (hint === 'number') return Number(value);
            if (hint === 'string') return String(value);
            return value;
          },
        };
      }
      return value && typeof value === 'object'
        ? Object.getOwnPropertyDescriptor(value, prop)
        : undefined;
    },
    getPrototypeOf(target: DerivedRune<T>) {
      const value = target.value;
      return value && typeof value === 'object'
        ? Object.getPrototypeOf(value)
        : Object.prototype;
    },
  }) as DerivedRune<T>;
}

export default { $state, $derived, $effect: effect, useRune, $ };
