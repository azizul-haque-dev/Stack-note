import SidebarToggle from "@/components/ui/SidebarToggle";
import type { DocNode } from "@/lib/docs";
import Link from "next/link";

interface NavbarProps {
  /** Top-level folder nodes from getTopLevelTopics() — injected by the layout */
  topics: DocNode[];
  /** The first slug segment of the current route, e.g. "javascript" */
  activeTopic?: string;
}

export default function Navbar({ topics, activeTopic }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#131313]/90 backdrop-blur-md border-b border-outline-variant/10 flex justify-between items-center px-4 md:px-8 h-16">
      <div className="flex items-center gap-4 md:gap-6">
        {/* Mobile Menu Toggle — Client Component */}
        <SidebarToggle
          icon="menu"
          className="md:hidden p-2 text-on-surface-variant hover:bg-[#1F1F1F] rounded-md transition-all"
        />

        <Link
          href="/"
          className="text-xl md:text-2xl font-bold tracking-tighter text-[#E2E2E2]"
        >
          StackNote
        </Link>

        {/* Dynamic topic links — same visual structure as before */}
        <div className="hidden md:flex gap-6 ml-8">
          {topics.map((topic) => {
            const isActive = activeTopic === topic.slug;
            const firstFile = findFirstFile(topic);
            const href = firstFile
              ? `/${firstFile.fullSlug}`
              : `/${topic.slug}`;

            return isActive ? (
              <Link
                key={topic.slug}
                href={href}
                className="text-[#14B8A6] border-b-2 border-[#14B8A6] pb-1"
              >
                {topic.name}
              </Link>
            ) : (
              <Link
                key={topic.slug}
                href={href}
                className="text-[#BBCAC6] hover:text-[#E2E2E2] transition-colors"
              >
                {topic.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-2">
          <button className="p-2 text-[#BBCAC6] hover:bg-[#1F1F1F] rounded-md transition-all">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <button className="p-2 text-[#BBCAC6] hover:bg-[#1F1F1F] rounded-md transition-all">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
        <button className="bg-linear-to-br from-primary to-primary-container text-on-primary px-3 md:px-4 py-2 rounded-md font-bold text-xs md:text-sm active:scale-95 transition-all">
          New Draft
        </button>
      </div>
    </nav>
  );
}

/** Depth-first search for the first file node in a tree */
function findFirstFile(node: DocNode): DocNode | null {
  if (node.type === "file") return node;
  for (const child of node.children ?? []) {
    const found = findFirstFile(child);
    if (found) return found;
  }
  return null;
}
