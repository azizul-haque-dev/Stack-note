
## JavaScript-এর সমস্যা এবং TypeScript কেন দরকার?

**সহজ  উত্তর :**  ধরেন বাহিরে বৃষ্টি হতে পারে তাই  রেইন কোট এবং হাটু পর্যন্ত পিভিসি (PVC) জুতো পরে বাহিরে বেরিছেন,


তেমনি  production এ কোড রান হওয়ার সময় error আসতে পারে তাই আগে থেকে type safe code লিখার জন্য typescript ব্যবহার করবেন,

JavaScript-এ আমরা যেকোনো জায়গায় যেকোনো ধরনের data set  করতে বা pass করতে পারি — সেটা `string`, `number`, `boolean` যাই হোক। JavaScript don’t mind সে কিছুই বলে না। কিন্তু এই **"freedom"** টাই বড় সমস্যা।

```js
// JavaScript — কোনো error নেই, কিন্তু behavior ভুল!
function greet(name) {
  return "Hello " + name;
}

console.log(greet("Azizul"));  // ✅ Hello Azizul
console.log(greet(42)); 
// Hello 42 — এইটা কি করল পুরাই gender change ?
console.log(greet(true));      //  Hello true — এটা কি চাই ছিলাম ?
```

**বাংলায়:** আমাকে আপনি বললেন "টাকা" দাও , কিন্তু আমি টাকা না দিয়ে দিলাম অন্য কিছু  — তখন আপনি কি বলবেন I dont mind যেইটা javascript করে । একটা চিৎকার দিয়ে বলবলেন টাকা দেন  TypeScript ও চিৎকার করে বলবে না এটা ঠিক না!"


JavaScript হলো **dynamically typed** language। মানে variable-এর type code  run করার সময়  decide হয়, compile time-এ না।
এতে অসুবিধা হলো :

- কোনো **compile-time type checking** থাকে না 
- Bug production ছাড়া catch করা যায় না 
- বড় team-এ code maintain করা কঠিন হয়ে পরে 

###  Code Examples

**Example 1 — Basic Problem (JavaScript)**
```js
function addNumbers(a, b) {
  return a + b;
}
console.log(addNumbers(5, 3));      // ✅ 8
console.log(addNumbers("5", 3));   // ❌ "53" — string concatenation হয়ে গেছে!
```

###  Common Mistakes

```js
// ভুল: Type না জেনে calculation
function calculateTax(income) {
  return income * 0.2; // income যদি string হয়? NaN আসবে
}

calculateTax("50000"); // NaN — silent bug!
```

### ✅ Best Practices
- JavaScript শেষ করার পরেই TypeScript শিখা শুরু করা 
- আপনি TypeScript কে "JavaScript" "এর strict mode" মনে করতে পারেন 

### When to Use
- যেকোনো production-grade project-এ
- Team collaboration এ

### ❌ When NOT to Use
- ছোট প্রজেক্ট  TypeScript overkill
- JavaScript basics না জেনে TypeScript শুরু করা মানে এক তরফা ভালোবাসা 



**Note:** TypeScript মানে JavaScript-এর উপরে কিছু extra power দেওয়া। সব valid JavaScript code ই valid TypeScript code — কিন্তু সব TypeScript code, valid JavaScript না।

###  Under the Hood

TypeScript file (`.ts`) → **TypeScript Compiler (TSC)** দিয়ে compile হয়ে → JavaScript file (`.js`) হয় 

 **browser বা Node-এ directly TypeScript কে চিনে ।** সবসময় আগে JavaScript-এ compile হয়। তারপরে  browser বা server  এ রান হয় 
 
এটা অনেকটা এরকম: আপনি Bengali-তে চিঠি লিখেছেন, কিন্তু post office শুধু English বোঝে। তাই আগে translator (TSC) দিয়ে translate করতে হয়, তারপর পাঠাও।

## Bottom Line
- JavaScript flexibility দেয়
- TypeScript control দেয়
