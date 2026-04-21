/**
 * Sidebar — Server Component
 *
 * Structural shell is IDENTICAL to the original.
 * Only the static nav links are replaced with <SidebarTree /> — a recursive
 * server component that renders the filesystem doc tree.
 *
 * Client interactivity (toggle, close-on-link-click) is unchanged — still
 * handled by SidebarToggle (Client) and SidebarLink (Client).
 */

import SidebarTree from "@/components/layout/SidebarTree";
import SidebarToggle from "@/components/ui/SidebarToggle";
import type { DocNode } from "@/lib/docs";

interface SidebarProps {
  /** Full doc tree injected from the layout/page Server Component */
  tree: DocNode[];
  /** Full slug of the current page, e.g. "javascript/basics/intro" */
  activeSlug?: string;
}

export default function Sidebar({ tree, activeSlug }: SidebarProps) {
  return (
    <aside
      id="left-sidebar"
      className="fixed hide-scrollbar
touch-pan-x left-0 top-0 md:top-16 w-64 h-full md:h-[calc(100vh-64px)] bg-[#0A0A0A] border-r border-outline-variant/10 overflow-y-auto"
    >
      <div className="p-6">
        {/* Mobile header — unchanged */}
        <div className="flex items-center justify-between md:hidden mb-8">
          <span className="text-xl font-bold tracking-tighter text-[#E2E2E2]">
            StackNote
          </span>
          <SidebarToggle
            icon="close"
            className="p-2 text-on-surface-variant hover:bg-[#1F1F1F] rounded-md"
          />
        </div>

        <div className="font-['Manrope'] text-sm font-bold text-primary tracking-widest uppercase mb-6">
          Documentation
        </div>

        {/* Dynamic recursive tree — replaces the static nav groups */}
        <SidebarTree nodes={tree} activeSlug={activeSlug} />
      </div>

      {/* Support box — unchanged */}
      <div className="mt-auto p-6 md:sticky md:bottom-0">
        <div className="bg-surface-container rounded-xl p-4">
          <p className="text-[10px] text-on-surface-variant">
            Need help? Join our community discord for professional support.
          </p>
          <button className="mt-2 text-primary font-bold text-xs hover:underline">
            Support Portal
          </button>
        </div>
      </div>
    </aside>
  );
}
