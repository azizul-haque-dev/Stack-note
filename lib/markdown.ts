import { cache } from "react";
import { codeToHtml } from "shiki";
import { visit } from "unist-util-visit";

const SHIKI_THEME = "github-dark";
const MAX_HIGHLIGHT_CHARS = 40000;
const MAX_HIGHLIGHT_LINES = 700;

const LANGUAGE_ALIASES: Record<string, string> = {
  cjs: "js",
  javascript: "js",
  jsx: "jsx",
  mjs: "js",
  ts: "ts",
  tsx: "tsx",
  typescript: "ts",
  bash: "bash",
  shell: "bash",
  sh: "bash",
  zsh: "bash",
  console: "bash",
  ps1: "powershell",
  pwsh: "powershell",
  yml: "yaml",
  md: "markdown",
  plaintext: "text",
  txt: "text",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLanguage(language?: string | null): string {
  if (!language) return "text";

  const normalized = language.trim().toLowerCase();
  if (!normalized) return "text";

  return LANGUAGE_ALIASES[normalized] ?? normalized;
}

function getLanguageLabel(language?: string | null): string {
  const normalized = normalizeLanguage(language);
  return normalized === "text" ? "TEXT" : normalized.toUpperCase();
}

function extractFenceMeta(codeNode: MarkdownCodeNode): { language: string; title?: string } {
  const language = normalizeLanguage(codeNode.lang);
  const meta = codeNode.meta?.trim();

  if (!meta) {
    return { language };
  }

  const titleMatch = meta.match(/title=(?:"([^"]+)"|'([^']+)')/i);
  return {
    language,
    title: titleMatch?.[1] ?? titleMatch?.[2],
  };
}

function encodeForClipboard(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function createPlainTextBlock(code: string): string {
  const safeCode = code.length > 0 ? escapeHtml(code) : "&nbsp;";
  return `<pre class="shiki shiki--plain" tabindex="0"><code>${safeCode}</code></pre>`;
}

const highlightCodeHtml = cache(async (code: string, language: string): Promise<string> => {
  const lineCount = code.split("\n").length;
  const shouldSkipShiki =
    code.length > MAX_HIGHLIGHT_CHARS || lineCount > MAX_HIGHLIGHT_LINES;

  if (shouldSkipShiki) {
    return createPlainTextBlock(code);
  }

  try {
    return await codeToHtml(code || " ", {
      lang: language,
      theme: SHIKI_THEME,
    });
  } catch {
    return createPlainTextBlock(code);
  }
});

const renderCodeBlock = cache(
  async (rawCode: string, languageHint?: string | null, title?: string): Promise<string> => {
    const code = rawCode.replace(/\n$/, "");
    const language = normalizeLanguage(languageHint);
    const highlightedHtml = await highlightCodeHtml(code, language);
    const clipboardValue = encodeForClipboard(code);
    const label = getLanguageLabel(language);
    const titleAttribute = title ? ` data-title="${escapeHtml(title)}"` : "";

    return [
      `<figure class="md-code-block hide-scrollbar" data-language="${escapeHtml(language)}"${titleAttribute}>`,
      `<figcaption class="md-code-block__header">`,
      `<span class="md-code-block__label">${label}</span>`,
      `<button`,
      ` class="md-code-block__copy"`,
      ` type="button"`,
      ` data-copy-code="${clipboardValue}"`,
      ` aria-label="Copy ${escapeHtml(language)} code to clipboard"`,
      `>`,
      `<span class="md-code-block__copy-label" data-copy-label>COPY</span>`,
      `</button>`,
      `</figcaption>`,
      `<div class="md-code-block__body hide-scrollbar">`,
      highlightedHtml,
      `</div>`,
      `</figure>`,
    ].join("");
  }
);

function remarkShikiCodeBlocks() {
  return async (tree: any) => {
    const transforms: Array<Promise<void>> = [];

    visit(tree as any, "code", (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      transforms.push(
        (async () => {
          const codeNode = node as MarkdownCodeNode;
          const { language, title } = extractFenceMeta(codeNode);
          const html = await renderCodeBlock(codeNode.value, language, title);
          parent.children[index] = {
            type: "html",
            value: html,
          } as MarkdownHtmlNode;
        })()
      );
    });

    await Promise.all(transforms);
  };
}

export const DEMO_CODE = `// The StackNote Layering Logic
const designSystem = {
    name: "StackNote Editor",
    principles: ["Obsidian Depth", "Asymmetry", "Tonal Shift"],
    active: true,

    applyStyles() {
        return this.principles.map((principle) => {
            return \`Layering: \${principle}\`;
        });
    }
};

console.log(designSystem.applyStyles());`;

export async function renderMarkdown(markdown: string): Promise<string> {
  const { remark } = await import("remark");
  const { default: remarkHtml } = await import("remark-html");
  const { default: remarkGfm } = await import("remark-gfm");

  const result = await remark()
    .use(remarkGfm)
    .use(remarkShikiCodeBlocks as any)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  return result.toString();
}

export interface PageMeta {
  title: string;
  description: string;
  breadcrumbs: { label: string; href: string }[];
}

export const OBSIDIAN_DEPTH_META: PageMeta = {
  title: "StackNote | Obsidian Depth",
  description:
    "Explore the Obsidian Depth design system - tonal layering, typography hierarchy, and premium markdown rendering.",
  breadcrumbs: [
    { label: "Docs", href: "#" },
    { label: "Editor Features", href: "#" },
    { label: "Obsidian Depth", href: "#" },
  ],
};
type MarkdownCodeNode = {
  lang?: string | null;
  meta?: string | null;
  value: string;
};

type MarkdownHtmlNode = {
  type: "html";
  value: string;
};
