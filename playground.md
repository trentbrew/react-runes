```js
import { $state, $derived, $effect, useRune, $ } from 'react-runes';

const count = $state(0);
const double = $derived(() => count.value * 2);

$effect(() => {
  console.log('double', double.value);
});

count.value = 1;


```