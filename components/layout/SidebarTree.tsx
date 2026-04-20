/**
 * SidebarTree — Server Component
 *
 * Recursively renders a DocNode tree using the EXACT same visual patterns
 * as the original static sidebar: section headers with expand/chevron icons,
 * nav-item-active highlight, hover states, and SidebarLink close-on-click.
 *
 * Infinite nesting is supported via recursion. Each level indents slightly.
 */

import type { DocNode } from "@/lib/docs";
import SidebarLink from "@/components/ui/SidebarLink";

interface SidebarTreeProps {
  nodes: DocNode[];
  /** Full slug of the currently active page, e.g. "javascript/basics/intro" */
  activeSlug?: string;
  /** Nesting depth — 0 = top level sections */
  depth?: number;
}

export default function SidebarTree({
  nodes,
  activeSlug,
  depth = 0,
}: SidebarTreeProps) {
  return (
    <div className={depth > 0 ? "ml-2 space-y-1" : "space-y-6"}>
      {nodes.map((node) => {
        if (node.type === "folder") {
          // Check if this folder contains the active page (to auto-open it)
          const containsActive = activeSlug
            ? activeSlug.startsWith(node.fullSlug + "/") ||
              activeSlug === node.fullSlug
            : false;

          return (
            <div key={node.fullSlug}>
              {/* Folder header — reuses exact original design */}
              <div className="flex items-center justify-between px-2 mb-3">
                <h3 className="text-[#E2E2E2] text-sm font-bold">
                  {node.name}
                </h3>
                <span className="material-symbols-outlined text-xs text-on-surface-variant">
                  {containsActive ? "expand_more" : "chevron_right"}
                </span>
              </div>

              {/* Recursive children */}
              <ul className="space-y-1">
                <SidebarTree
                  nodes={node.children ?? []}
                  activeSlug={activeSlug}
                  depth={depth + 1}
                />
              </ul>
            </div>
          );
        }

        // File node — a nav link
        const isActive = activeSlug === node.fullSlug;

        return (
          <li key={node.fullSlug} className="list-none">
            <SidebarLink
              href={`/${node.fullSlug}`}
              className={
                isActive
                  ? "block px-2 py-1.5 text-sm nav-item-active"
                  : "block px-2 py-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
              }
            >
              {node.name}
            </SidebarLink>
          </li>
        );
      })}
    </div>
  );
}
