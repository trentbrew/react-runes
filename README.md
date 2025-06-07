# React Runes (Svelte 5-Inspired React State)

## Overview

This project is an experiment to bring Svelte 5's reactivity and ergonomics to a Next.js (React) codebase. It uses a custom runes system for state, derived values, and effects, and introduces a Svelte-inspired `$` hook for simple, reactive subscriptions in React components.

- **Framework:** Next.js (React)
- **State System:** Custom runes (state, derived, effect)
- **Reactivity Hook:** `$` (dollar sign)
- **Architecture:** Vertical slice (component + store colocated)

## Installation

To get started, clone the repository and install dependencies:

```bash
npm install react-runes
```

---

## Philosophy

- **Simplicity:** Minimal API surface, inspired by Svelte's `$` reactivity.
- **Usability:** Reactive values in components with a single character (`$`).
- **Isolation:** Each feature/component has its own store and logic (vertical slice).
- **Experimentation:** Not intended for production—meant to push the boundaries of React ergonomics.

---

## How It Works

### Runes System

- `state(initial)`: Create a reactive state value.
- `derived(fn)`: Create a computed value that updates when dependencies change.
- `effect(fn)`: Run side effects when dependencies change.

### The `$` Hook

- **Usage:** `const value = $(rune)`
- **What it does:** Subscribes the component to the rune's value. The component re-renders when the value changes.
- **Inspired by:** Svelte's `$` syntax for reactive values.

#### Example

```tsx
import { state, derived, effect, $ } from 'react-runes';

const count = state(0);
const doubleCount = derived(() => count.value * 2);

effect(() => {
  console.log('Count changed:', count.value);
});

export default function Counter() {
  const countValue = $(count);
  const doubleValue = $(doubleCount);

  return (
    <div>
      <p>Count: {countValue}</p>
      <p>Double: {doubleValue}</p>
      <button onClick={() => (count.value += 1)}>Increment</button>
    </div>
  );
}
```

---

## Vertical Slice Architecture

Each feature/component lives in its own directory, colocated with its store and logic:

```yaml
components/
counter-example/
counter-example.tsx
counter.ts
todo-example/
todo-example.tsx
todos.ts
```

- **Import from local store:**
  ```ts
  import { todos, addTodo } from './todos';
  ```

---

## Why `$`?

- **Concise:** One character, easy to type and spot in code.
- **Svelte-inspired:** Brings Svelte's reactivity feel to React.
- **Explicitly reactive:** Makes it clear which values are reactive in components.

---

## Limitations

- Not idiomatic React—this is an experiment!
- Not intended for production use.
- Some React tooling (linting, auto-imports) may not recognize `$` as a hook.

---

## Contributing

This is a playground for reactivity experiments. PRs and ideas welcome!

---

## License

MIT
