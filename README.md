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

- `state(initial)`: Create a reactive state value. You must use `.value` to access/mutate.
- `$state(initial)`: Creates a reactive proxy. No `.value` needed for objects.
- `derived(fn)`: Create a computed value that updates when dependencies change. Must use `.value`.
- `$derived(fn)`: Creates a reactive proxy for computed values. No `.value` needed.
- `effect(fn)`: Run side effects when dependencies change.
- `untrack(fn)`: Execute a function without tracking its dependencies.

### The `$` Hook

- **Usage:** `const value = $(rune)`
- **What it does:** Subscribes the component to the rune's value. The component re-renders when the value changes.
- **Inspired by:** Svelte's `$` syntax for reactive values.

#### Example

Here's an example that shows how to use `$state` and `$derived` with a user object.

```tsx
import { $state, $derived, effect, $ } from 'react-runes';

// Create a reactive user object
const user = $state({
  firstName: 'John',
  lastName: 'Doe',
});

// Create a derived value for the full name
const fullName = $derived(() => `${user.firstName} ${user.lastName}`);

effect(() => {
  console.log('User changed:', user.firstName, user.lastName);
});

export default function UserProfile() {
  const localUser = $(user);
  const localFullName = $(fullName);

  return (
    <div>
      <p>First Name: {localUser.firstName}</p>
      <p>Last Name: {localUser.lastName}</p>
      <p>Full Name: {localFullName}</p>
      <input
        type="text"
        value={localUser.firstName}
        onChange={(e) => (user.firstName = e.target.value)}
        className="border p-2 rounded"
      />
      <input
        type="text"
        value={localUser.lastName}
        onChange={(e) => (user.lastName = e.target.value)}
        className="border p-2 rounded"
      />
    </div>
  );
}
```

---

### Full Todo Example

Here's a more complete example—a classic Todo app—showing how to use `$state`, `$derived`, and the `$` hook for a dynamic list with add, toggle, and remove functionality:

```tsx
import React from 'react';
import { $state, $derived, $ } from 'react-runes';

// Reactive state for todos and input
const todos = $state([
  { id: 1, text: 'Learn React Runes', done: false },
  { id: 2, text: 'Build something cool', done: false },
]);
const input = $state('');

// Derived value for remaining todos
const remaining = $derived(
  () => ($(todos) ?? []).filter((t) => !t.done).length,
);

// Helper to add a todo
function addTodo() {
  const text = ($(input) ?? '').trim();
  if (text) {
    todos.value = [...($(todos) ?? []), { id: Date.now(), text, done: false }];
    input.value = '';
  }
}

// Helper to toggle a todo
function toggleTodo(id: number) {
  todos.value = ($(todos) ?? []).map((t) =>
    t.id === id ? { ...t, done: !t.done } : t,
  );
}

// Helper to remove a todo
function removeTodo(id: number) {
  todos.value = ($(todos) ?? []).filter((t) => t.id !== id);
}

export default function Todos() {
  const list = $(todos) ?? [];
  const value = $(input) ?? '';
  const left = $(remaining) ?? 0;

  return (
    <div
      style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'sans-serif' }}
    >
      <h2>Todos</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo();
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <input
          value={value}
          onChange={(e) => (input.value = e.target.value)}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Add</button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 16 }}>
        {list.map((todo) => (
          <li
            key={todo.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              textDecoration: todo.done ? 'line-through' : undefined,
              color: todo.done ? '#888' : undefined,
            }}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ flex: 1 }}>{todo.text}</span>
            <button
              onClick={() => removeTodo(todo.id)}
              style={{ color: 'red' }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 12, color: '#555' }}>{left} left</div>
    </div>
  );
}
```

---

## Vertical Slice Architecture

Each feature/component lives in its own directory, colocated with its store and logic:

```yaml
components/
user-profile/
user-profile.tsx
user.ts // user rune is defined here
```

- **Import from local store:**
  ```ts
  import { user, fullName } from './user';
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
