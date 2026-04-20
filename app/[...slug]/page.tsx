/**
 * /app/[...slug]/page.tsx — Dynamic Doc Page
 *
 * SERVER COMPONENT. Handles any route like:
 *   /javascript/basics/intro
 *   /react/hooks/useState
 *   /typescript/fundamentals/types
 *
 * DATA FLOW:
 *   1. Next.js resolves the [...slug] catch-all at build time via generateStaticParams()
 *   2. getDocBySlug(slug) reads the markdown file from /docs on the filesystem
 *   3. renderMarkdown() converts it to HTML via remark (server-side, cached)
 *   4. extractHeadings() parses headings for the RightToc
 *   5. getDocTree() and getTopLevelTopics() supply the Sidebar and Navbar
 *   6. Everything is rendered to static HTML — zero client JS for content
 *
 * CACHING STRATEGY:
 *   - generateStaticParams() → all routes pre-rendered at build time (SSG)
 *   - Filesystem reads happen ONCE at build — the CDN edge serves HTML
 *   - To enable hot-reloading of markdown edits without rebuild:
 *     add `export const revalidate = 60` (ISR — revalidates every 60s)
 *   - Client components (CopyButton, SidebarToggle) add minimal JS hydration
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// Layout components — Server Components, unchanged visually
import Navbar from "@/components/layout/Navbar";
import RightToc from "@/components/layout/RightToc";
import Sidebar from "@/components/layout/Sidebar";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import SidebarOverlay from "@/components/ui/SidebarOverlay";

// Filesystem engine — Server-only, never sent to client
import {
  extractHeadings,
  getAdjacentDocs,
  getAllDocFiles,
  getDocBySlug,
  getDocTree,
  getTopLevelTopics
} from "@/lib/docs";

// Markdown renderer — Server-only async function
import { renderMarkdown } from "@/lib/markdown";

// ─── Static Params ─────────────────────────────────────────────────────────────

/**
 * Pre-generates ALL doc routes at build time.
 * Next.js calls this once; the result tells it which slugs to statically render.
 * No filesystem reads happen at request time.
 */
export async function generateStaticParams() {
  const allFiles = getAllDocFiles();
  return allFiles.map((file) => ({
    slug: file.fullSlug.split("/")
  }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) return { title: "Not Found | StackNote" };

  const title = doc.frontmatter.title
    ? `StackNote | ${doc.frontmatter.title}`
    : `StackNote | ${slug[slug.length - 1]}`;

  return {
    title,
    description: doc.frontmatter.description ?? "StackNote documentation."
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DocPage({
  params
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  // 1. Read markdown file from filesystem
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  // 2. Render markdown → HTML (server-side, cached at build)
  const html = await renderMarkdown(doc.content);

  // 3. Extract headings for the right TOC
  const headings = extractHeadings(doc.content);

  // 4. Build sidebar tree and navbar topics (filesystem read, cached at build)
  const tree = getDocTree();
  const topics = getTopLevelTopics();

  // 5. Active state helpers
  const activeSlug = slug.join("/"); // e.g. "javascript/basics/intro"
  const activeTopic = slug[0]; // e.g. "javascript"

  // 6. Previous / Next navigation
  const { prev, next } = getAdjacentDocs(slug);

  // 7. Breadcrumbs from slug segments
  const breadcrumbs = slug.map((segment, i) => ({
    label: segment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + slug.slice(0, i + 1).join("/"),
    isLast: i === slug.length - 1
  }));

  // 8. Mobile TOC items (same headings as RightToc)
  const mobileTocItems = headings.slice(0, 8); // cap for mobile dropdown

  return (
    <>
      {/* Mobile sidebar overlay — Client Component */}
      <SidebarOverlay />

      {/* Navbar — Server Component, now dynamic */}
      <Navbar topics={topics} activeTopic={activeTopic} />

      <div className="flex pt-16 min-h-screen">
        {/* Sidebar — Server Component, now dynamic with active state */}
        <Sidebar tree={tree} activeSlug={activeSlug} />

        {/* Main content */}
        <main className="flex-1 w-full md:ml-64 lg:mr-72 px-4 py-8 md:px-8 lg:px-16 max-w-full overflow-x-hidden">
          {/* Mobile TOC Dropdown */}
          {mobileTocItems.length > 0 && (
            <div className="lg:hidden mb-6">
              <details className="group bg-surface-container rounded-lg overflow-hidden border border-outline-variant/10">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">
                    On This Page
                  </span>
                  <span className="material-symbols-outlined text-sm text-on-surface-variant group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <div className="px-4 pb-4 border-t border-outline-variant/5">
                  <ul className="space-y-3 pt-3 text-[13px]">
                    {mobileTocItems.map((h, i) => (
                      <li key={`${h.id}-${i}`}>
                        <Link
                          href={`#${h.id}`}
                          className={
                            i === 0
                              ? "text-primary font-bold"
                              : "text-on-surface-variant"
                          }
                          style={{
                            paddingLeft:
                              h.level > 1
                                ? `${(h.level - 1) * 12}px`
                                : undefined
                          }}
                        >
                          {h.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          )}

          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-6 md:mb-8 overflow-x-auto whitespace-nowrap"
          >
            <Link className="hover:text-primary" href="/">
              Docs
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                {crumb.isLast ? (
                  <span className="text-on-surface">{crumb.label}</span>
                ) : (
                  <Link className="hover:text-primary" href={crumb.href}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Rendered markdown content */}
          <MarkdownRenderer html={html} />

          {/* Footer — previous / next navigation */}
          <footer className="mt-16 pt-12 border-t border-outline-variant/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
              {prev ? (
                <Link
                  href={`/${prev.fullSlug}`}
                  className="group flex flex-col items-start gap-2 max-w-[200px]"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold">
                    Previous
                  </span>
                  <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-sm">
                      arrow_back
                    </span>
                    <span className="font-bold text-sm">{prev.name}</span>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link
                  href={`/${next.fullSlug}`}
                  className="group flex flex-col items-start sm:items-end gap-2 text-left sm:text-right max-w-[200px]"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold">
                    Next
                  </span>
                  <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
                    <span className="font-bold text-sm">{next.name}</span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              ) : (
                <div />
              )}
            </div>

            <div className="mt-12 text-center text-[10px] text-on-surface-variant/40 tracking-widest uppercase">
              Last updated{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </div>
          </footer>
        </main>

        {/* Right TOC — dynamic headings extracted from markdown */}
        <RightToc headings={headings} />
      </div>

      {/* Floating Action Toolbar — unchanged */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-surface-container-highest/60 backdrop-blur-xl border border-outline-variant/10 rounded-full px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-1 shadow-2xl z-50">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">edit</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">visibility</span>
        </button>
        <div className="w-[1px] h-4 bg-outline-variant/20 mx-1" />
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-lg">share</span>
        </button>
      </div>
    </>
  );
}
