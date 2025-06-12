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
