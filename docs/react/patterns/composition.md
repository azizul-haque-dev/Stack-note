---
title: Component Composition
description: Building flexible, reusable React components through composition patterns.
---

# Component Composition

React's component model is built on composition. Rather than inheritance, you build complex UIs from smaller, self-contained pieces.

## The Children Pattern

```javascript
function Card({ children }) {
  return (
    <div className="card">
      {children}
    </div>
  );
}

// Usage
<Card>
  <h2>Title</h2>
  <p>Content here</p>
</Card>
```

## Slot Pattern

Pass named render props for more control:

```javascript
function Layout({ header, sidebar, main }) {
  return (
    <div>
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{main}</main>
    </div>
  );
}
```

Composition keeps components decoupled and highly reusable.
