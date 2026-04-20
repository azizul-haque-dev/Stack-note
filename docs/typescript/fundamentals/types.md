---
title: TypeScript Types
description: Understanding the TypeScript type system — primitives, unions, intersections, and generics.
---

# TypeScript Types

TypeScript is a strongly-typed superset of JavaScript. Its type system catches bugs at compile time, before your code ever runs.

## Primitives

```typescript
const name: string = "StackNote";
const version: number = 2;
const dark: boolean = true;
```

## Union Types

A value can be one of several types:

```typescript
type Theme = "dark" | "light" | "system";

function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}
```

## Generics

Write reusable code that works across multiple types:

```typescript
function identity<T>(value: T): T {
  return value;
}

const result = identity<string>("hello"); // typed as string
```

Generics are the backbone of TypeScript's reusable utility types like `Array<T>`, `Promise<T>`, and `Record<K, V>`.
