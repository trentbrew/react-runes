# runes

Reactive primitives for React. No magic, just signals.

```tsx
import { state, derived, effect, $ } from 'runes';

const count = state(0);
const doubled = derived(() => count.get() * 2);

effect(() => {
  console.log('Count changed:', count.get());
});

function Counter() {
  return (
    <button onClick={() => count.set(count.get() + 1)}>
      {$(count.get)} / {$(doubled.get)}
    </button>
  );
}
```
