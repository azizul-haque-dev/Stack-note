# 📘 TypeScript Setup

##  Global vs Local TypeScript Installation

### Simple Explanation
TypeScript install করার দুইটা উপায় আছে:
- **Global:** পুরো system-এ একবার install করা (Not recomanded), যেকোনো জায়গা থেকে `tsc` command চলবে
- **Local (Project-level):** শুধু ঐ project-এর মধ্যে install হবে, version control নিজের কাছে থাকবে 

```bash
# Global install
npm install -g typescript

# Local (project-level) install — recommended ✅
npm install -D typescript
```

---


### Local install করলে TypeScript binary যায় 
`node_modules/.bin/tsc`-তে। এই কারণে directly `tsc` command  চলে না — `npx tsc` command দিয়ে চালাতে হয়, কারণ `npx` ঐ `node_modules/.bin/` path automatically খোঁজে।



```bash
# Step 1: Project init
npm init -y

# Step 2: TypeScript install as devDependency
npm install -D typescript

# Step 3: Check version
npx tsc --version
```

### Common Mistakes
```bash
# ❌ ভুল: globaly install করার পরে version mismatch হয়
npm install -g typescript@4.x
# আরেক project-এ TypeScript 5.x দরকার হলে — conflict হবে!

# ✅ সঠিক: প্রতি project-এ local install
npm install -D typescript
```

### Best Practices
- সবসময় **local install** করা, কারণ বিভিন্ন project-এ বিভিন্ন TypeScript version লাগতে পারে
- `package.json`-এ `-D` (`devDependency`) হিসেবে রাখো — TypeScript production-এ যাবে না , শুধু development-এ থাকবে 


### ❌ When NOT to Use
- Global install তখনই করবেন যখন ছোট experiment বা একটাই machine-এ একটাই project

---

##  `devDependencies` vs `dependencies`

`package.json`-এ দুই ধরনের dependency থাকে:

| Type | Key | কখন লাগে |
|------|-----|----------|
| `dependencies` | Runtime-এ লাগে | যেমন `express`, `react` |
| `devDependencies` | শুধু Development-এ | যেমন `typescript`, `jest` |


```json
// package.json
{
  "dependencies": {
    "express": "^4.18.0"    // Production server-এ যাবে
  },
  "devDependencies": {
    "typescript": "^5.9.3", // Production build-এ যাবে না
    "@types/node": "^20.0.0"
  }
}
```

TypeScript compile হয়ে `.js` হয়ে যায় — তারপর ঐ `.js` production-এ চলে। তাই TypeScript নিজে production-এ install করার দরকার নেই।



### Common Mistakes
```bash
# ❌ TypeScript-কে regular dependency হিসেবে install করা
npm install typescript
# এতে production bundle বড় হয়ে যায় — unnecessary!

# ✅ সঠিক
npm install -D typescript
```

---

##  `tsconfig.json` — TypeScript Configuration File

###  Simple Explanation
`tsconfig.json` হলো TypeScript compiler-এর "instruction manual"। এখানে বলা হয়:
- কোথা থেকে TypeScript file নেবে (input)
- কোথায় JavaScript output দেবে (output)
- কতটা strict হবে
- কোন JavaScript version target করবে

```bash
# tsconfig তৈরি করতে
npx tsc --init
```

### Key Options বিশ্লেষণ

```json
{
  "compilerOptions": {
    // 1: Target: কোন JS version-এ compile হবে
    "target": "ES2020",
    // ES3, ES5, ES6, ES2020, ESNext — পুরনো browser support করতে হলে ES5

    // 2: Module System
    "module": "commonjs",
    // Node.js-এ commonjs, Browser/Modern-এ ESNext

    // 3: Root Directory — TypeScript files কোথায়
    "rootDir": "./src",

    // 4: Output Directory — Compiled JS কোথায় যাবে
    "outDir": "./dist",

    // 5: Strict Mode — সবচেয়ে গুরুত্বপূর্ণ!
    "strict": true,
    // এটা enable করলে অনেকগুলো sub-option ON হয়:
    // - noImplicitAny: implicit 'any' type allow করবে না
    // - strictNullChecks: null/undefined check করতে বাধ্য করবে
    // - strictFunctionTypes: function type check করবে

    // 6: Source Map — Debugging-এর জন্য
    "sourceMap": true,
    // .map file তৈরি হয়, যা browser/debugger কে বলে
    // কোন TS line কোন JS line-এর সাথে match করে

    // 7: Declaration Files
    "declaration": true
    // .d.ts file তৈরি করে — library publish করলে দরকার
  },
  "include": ["src/**/*"],   // কোন files compile হবে
  "exclude": ["node_modules"] // কোন files বাদ যাবে
}
```


**Basic tsconfig:**
```json
{
  "compilerOptions": {
    "target": "ES6",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

**Intermediate — Node.js project:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Advanced — Monorepo/Library:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

###  Common Mistakes

```json
// ❌ ভুল: strict mode বন্ধ রাখা
{
  "compilerOptions": {
    "strict": false  // TypeScript-এর সুবিধাই নষ্ট হয়ে যায়!
  }
}

// ❌ ভুল: rootDir এবং outDir না দেওয়া
// তাহলে .ts এর পাশেই .js তৈরি হয় — messy!

// ✅ সঠিক
{
  "compilerOptions": {
    "strict": true,
    "rootDir": "./src",
    "outDir": "./dist"
  }
}
```

### Best Practices
- সবসময় `"strict": true` রাখা 
- `rootDir: "./src"` এবং `outDir: "./dist"` define করা 
- `"skipLibCheck": true` দেয়া — third-party library type error ignore করতে

---
###  `package.json` Scripts Setup

```json
{
  "scripts": {
    "build": "npx tsc",
    "start": "node dist/index.js",
    "dev": "npx tsc --watch",
  }
}
```
```bash
# Development-এ watch mode (file change হলে auto compile)
npm run dev

### Common Mistakes

```bash
# ❌ ভুল: .ts file directly node দিয়ে চালানো
node src/index.ts  # Error! Node JS বোঝে, TS না

# ✅ সঠিক: আগে compile করো
npx tsc
node dist/index.js
```

## Interview-Level Tricky Questions
**"`strict: true` enable করলে ঠিক কী কী option ON হয়? সবচেয়ে important কোনটা?"**

**Answer:**
`strict: true` একসাথে এই options enable করে:

```json
{
  "noImplicitAny": true,       // implicit 'any' বন্ধ
  "strictNullChecks": true,    // null/undefined আলাদাভাবে check করতে হবে
  "strictFunctionTypes": true, // function parameter contravariance check
  "strictBindCallApply": true, // bind/call/apply এর type check
  "strictPropertyInitialization": true, // class property initialize করতে হবে
  "noImplicitThis": true,      // 'this' এর type বলতে হবে
  "alwaysStrict": true         // 'use strict' mode
}
```

