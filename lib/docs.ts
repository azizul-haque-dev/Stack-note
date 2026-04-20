/**
 * lib/docs.ts — Filesystem Documentation Engine
 *
 * SERVER ONLY. Never imported by client components.
 * Reads the /docs directory recursively and returns a typed tree.
 *
 * CACHING STRATEGY:
 * - `getDocTree()` is called inside Server Components.
 * - Next.js statically renders those components at build time (SSG).
 * - The result is baked into HTML — the filesystem is NEVER read at runtime.
 * - For ISR (editing docs without rebuilding), add `export const revalidate`
 *   to the page. The cache is then invalidated per the revalidation window.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

// Root docs directory — resolved from project root
const DOCS_ROOT = path.join(process.cwd(), "docs");

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocNode = {
  /** Display name — title-cased from the filename/folder name */
  name: string;
  /** URL-safe slug segment, e.g. "basics" or "intro" */
  slug: string;
  /** Full slug path from docs root, e.g. "javascript/basics/intro" */
  fullSlug: string;
  type: "folder" | "file";
  children?: DocNode[];
};

export type DocFrontmatter = {
  title?: string;
  description?: string;
};

export type DocFile = {
  frontmatter: DocFrontmatter;
  /** Raw markdown source (without frontmatter) */
  content: string;
  /** Full slug path, e.g. ["javascript", "basics", "intro"] */
  slugParts: string[];
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Convert a kebab/snake filename to a readable Title Case label */
function toLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strip .md extension from a filename */
function stripExt(name: string): string {
  return name.replace(/\.md$/, "");
}

// ─── Core: Recursive Tree Builder ─────────────────────────────────────────────

/**
 * Recursively reads a directory and builds a DocNode tree.
 * Files come after folders; both sorted alphabetically.
 */
function buildTree(dir: string, parentSlug: string = ""): DocNode[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const folders: DocNode[] = [];
  const files: DocNode[] = [];

  for (const entry of entries) {
    // Skip hidden files / system files
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    if (entry.isDirectory()) {
      const slug = entry.name;
      const fullSlug = parentSlug ? `${parentSlug}/${slug}` : slug;
      const children = buildTree(path.join(dir, entry.name), fullSlug);

      folders.push({
        name: toLabel(entry.name),
        slug,
        fullSlug,
        type: "folder",
        children,
      });
    } else if (entry.name.endsWith(".md")) {
      const rawSlug = stripExt(entry.name);
      const fullSlug = parentSlug ? `${parentSlug}/${rawSlug}` : rawSlug;

      files.push({
        name: toLabel(rawSlug),
        slug: rawSlug,
        fullSlug,
        type: "file",
      });
    }
  }

  // Folders first, then files — each group sorted alphabetically
  return [
    ...folders.sort((a, b) => a.slug.localeCompare(b.slug)),
    ...files.sort((a, b) => a.slug.localeCompare(b.slug)),
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full documentation tree.
 *
 * Called by Navbar (top-level folders) and Sidebar (full tree).
 * Runs at build time; result is cached as static HTML.
 */
export function getDocTree(): DocNode[] {
  return buildTree(DOCS_ROOT);
}

/**
 * Returns only the top-level nodes (folders = topics for the Navbar).
 */
export function getTopLevelTopics(): DocNode[] {
  return getDocTree().filter((n) => n.type === "folder");
}

/**
 * Reads a markdown file by its slug parts (e.g. ["javascript", "basics", "intro"]).
 * Returns frontmatter + raw content string.
 * Returns null if the file does not exist.
 */
export function getDocBySlug(slugParts: string[]): DocFile | null {
  const filePath = path.join(DOCS_ROOT, ...slugParts) + ".md";

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    frontmatter: data as DocFrontmatter,
    content,
    slugParts,
  };
}

/**
 * Flattens the entire tree into a list of file nodes.
 * Used for generating static params (generateStaticParams).
 */
export function getAllDocFiles(nodes: DocNode[] = getDocTree()): DocNode[] {
  const result: DocNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      result.push(node);
    } else if (node.children) {
      result.push(...getAllDocFiles(node.children));
    }
  }

  return result;
}

/**
 * Given the current slug parts, find the previous and next file in the
 * flattened doc tree — used for footer navigation.
 */
export function getAdjacentDocs(currentSlugParts: string[]): {
  prev: DocNode | null;
  next: DocNode | null;
} {
  const all = getAllDocFiles();
  const currentFullSlug = currentSlugParts.join("/");
  const idx = all.findIndex((n) => n.fullSlug === currentFullSlug);

  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}

/**
 * Extract headings (h1–h3) from markdown content for the right-side TOC.
 * No remark required — simple regex is fast and zero-dep.
 */
export type TocHeading = {
  level: 1 | 2 | 3;
  text: string;
  id: string;
};

export function extractHeadings(markdown: string): TocHeading[] {
  const lines = markdown.split("\n");
  const headings: TocHeading[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length as 1 | 2 | 3;
    const text = match[2].trim();
    // Generate an id matching the GitHub/remark style
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    headings.push({ level, text, id });
  }

  return headings;
}
