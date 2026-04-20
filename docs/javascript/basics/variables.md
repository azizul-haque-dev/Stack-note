---
title: Variables in JavaScript
description: Understanding var, let, and const in modern JavaScript.
---

# Variables in JavaScript

JavaScript has three ways to declare variables: `var`, `let`, and `const`. Understanding when to use each is critical to writing predictable code.

## The Modern Way

Since ES6, `let` and `const` are the preferred declarations.

```javascript
// Block-scoped, reassignable
let count = 0;
count = 1; // valid

// Block-scoped, NOT reassignable
const name = "StackNote";
// name = "other"; // TypeError
```

## Hoisting

`var` declarations are hoisted to the top of their scope. `let` and `const` are not initialized until their declaration is reached — this is called the **Temporal Dead Zone**.
