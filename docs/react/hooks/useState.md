---
title: useState Hook
description: Managing local state in React functional components with useState.
---

# useState Hook

`useState` is the most fundamental React hook. It lets you add state to functional components without writing a class.

## Basic Usage

```javascript
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

## Rules of Hooks

1. Only call hooks at the **top level** — never inside loops, conditions, or nested functions.
2. Only call hooks from **React function components** or custom hooks.

## Lazy Initialization

If computing the initial state is expensive, pass a function to `useState`:

```javascript
const [state, setState] = useState(() => computeExpensiveValue());
```

This function runs only on the first render.
