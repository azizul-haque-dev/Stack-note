/**
 * lib/highlighter.ts — Server-side Dracula syntax highlighter
 *
 * Zero client JS. Runs once at build time inside Server Components.
 * Covers JavaScript / TypeScript / JSX with the full Dracula palette.
 *
 * Token order matters: later rules cannot re-tokenize already-wrapped spans.
 * The pipeline processes the code in a single deterministic pass using a
 * state-machine approach (split by already-highlighted spans to avoid
 * double-processing).
 *
 * Production upgrade path: swap this for `shiki` with the dracula theme
 * for 100% accurate tmGrammar tokenisation across all languages.
 */

// ─── Dracula color reference ────────────────────────────────────────────────
// #f8f8f2  foreground / variables
// #6272a4  comment (blue-grey, italic)
// #ff79c6  keyword / operator / tag (pink)
// #f1fa8c  string (yellow)
// #50fa7b  function name (green)
// #bd93f9  number / boolean / null (purple)
// #8be9fd  builtin / class (cyan, italic)
// #ffb86c  regex / template expression (orange)
// #66d9e8  property / attribute (cyan-light)

type TokenRule = {
  pattern: RegExp;
  className: string;
};

/**
 * Escape HTML special characters to prevent XSS.
 * Applied FIRST, before any span injection.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wrap matched text in a syntax-* span.
 */
function wrap(className: string, text: string): string {
  return `<span class="${className}">${text}</span>`;
}

/**
 * Highlight a single line of code.
 * Processes in priority order: comments → strings → numbers → keywords →
 * builtins → functions → operators → booleans/null.
 */
function highlightLine(line: string): string {
  // We'll build the output character by character using a simple approach:
  // collect "segments" — either raw text or a classified token.
  type Segment = { raw: string } | { cls: string; text: string };
  const segments: Segment[] = [];
  let remaining = line;

  // Ordered rules — first match wins for each position
  const rules: TokenRule[] = [
    // Single-line comment — must come before regex/strings
    { pattern: /^(\/\/.*)$/, className: "syntax-comment" },

    // Template literal (backtick) — greedy but stops at end of line
    { pattern: /^(`[^`]*`)/, className: "syntax-string" },

    // Double-quoted string
    { pattern: /^("(?:[^"\\]|\\.)*")/, className: "syntax-string" },

    // Single-quoted string
    { pattern: /^('(?:[^'\\]|\\.)*')/, className: "syntax-string" },

    // Numeric literal (int, float, hex, binary)
    { pattern: /^(\b(?:0x[\da-fA-F]+|0b[01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b)/, className: "syntax-number" },

    // Keywords (pink)
    {
      pattern: /^(\b(?:const|let|var|function|return|this|new|class|extends|import|export|default|from|async|await|of|in|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|typeof|instanceof|void|delete|yield|static|get|set|super)\b)/,
      className: "syntax-keyword",
    },

    // Boolean / null / undefined (purple)
    {
      pattern: /^(\b(?:true|false|null|undefined|NaN|Infinity)\b)/,
      className: "syntax-number",
    },

    // Built-in globals / constructors (cyan italic)
    {
      pattern: /^(\b(?:console|Math|JSON|Object|Array|String|Number|Boolean|Symbol|Promise|Map|Set|WeakMap|WeakSet|Date|RegExp|Error|fetch|window|document|process|module|require|globalThis)\b)/,
      className: "syntax-builtin",
    },

    // Function call — identifier followed by (
    { pattern: /^([a-zA-Z_$][\w$]*(?=\s*\())/, className: "syntax-function" },

    // Arrow / assignment operators
    { pattern: /^(=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=!<>&|^~?:])/, className: "syntax-operator" },
  ];

  while (remaining.length > 0) {
    let matched = false;

    for (const rule of rules) {
      const m = remaining.match(rule.pattern);
      if (m) {
        segments.push({ cls: rule.className, text: escapeHtml(m[1]) });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Emit the next character as raw (already safe after escapeHtml on tokens)
      const ch = remaining[0];
      segments.push({ raw: escapeHtml(ch) });
      remaining = remaining.slice(1);
    }
  }

  return segments
    .map((s) => ("raw" in s ? s.raw : wrap(s.cls, s.text)))
    .join("");
}

/**
 * Public API — highlight a full multi-line code string.
 * Returns HTML string safe for dangerouslySetInnerHTML.
 */
export function highlightCode(code: string, _language = "javascript"): string {
  return code
    .split("\n")
    .map(highlightLine)
    .join("\n");
}

// Keep backward-compat alias used in lib/markdown.ts
export { highlightCode as highlightJavaScript };
