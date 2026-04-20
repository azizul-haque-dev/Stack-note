---
title: Closures
description: Deep dive into JavaScript closures — one of the most powerful and misunderstood features.
---

# Closures

A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment). Closures give you access to an outer function's scope from an inner function.

## Classic Example

```javascript
function makeCounter() {
  let count = 0;

  return function increment() {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

The inner `increment` function retains access to `count` even after `makeCounter` has finished executing. That's a closure.

## Practical Uses

- **Data encapsulation** — hide private state
- **Factory functions** — generate specialized functions
- **Memoization** — cache expensive computations
