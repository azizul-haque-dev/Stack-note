/**
 * RightToc — Server Component
 *
 * Accepts a dynamic list of headings extracted from the markdown file.
 * Visual structure is IDENTICAL to the original static TOC.
 */

import Link from "next/link";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import type { TocHeading } from "@/lib/docs";

interface RightTocProps {
  headings: TocHeading[];
}

export default function RightToc({ headings }: RightTocProps) {
  return (
    <aside className="hidden lg:block w-72 fixed right-0 top-16 h-[calc(100vh-64px)] p-8 overflow-y-auto border-l border-outline-variant/5">
      <div className="font-['Manrope']">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#14B8A6] uppercase">
            On This Page
          </span>
        </div>

        <ul className="space-y-4 text-[13px] border-l border-outline-variant/10">
          {headings.map((heading, i) => {
            // h1 → pl-4 + bold + active-style for the first one
            // h2 → pl-8
            // h3 → pl-10 (deeper indent)
            const isFirstH1 = i === 0 && heading.level === 1;

            const indentClass =
              heading.level === 1
                ? "pl-4"
                : heading.level === 2
                ? "pl-8"
                : "pl-10";

            const activeClass = isFirstH1
              ? "border-l-2 border-primary -ml-[1px]"
              : "";

            const textClass = isFirstH1
              ? "text-primary font-bold"
              : heading.level === 1
              ? "text-on-surface hover:text-[#14B8A6] transition-colors font-bold"
              : "text-on-surface-variant hover:text-[#14B8A6] transition-colors";

            return (
              <li
                key={`${heading.id}-${i}`}
                className={`${indentClass} ${activeClass}`}
              >
                <Link href={`#${heading.id}`} className={`block ${textClass}`}>
                  {heading.text}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-12 pt-8 border-t border-outline-variant/10 space-y-4">
          <Link
            href="#"
            className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Edit this page</span>
          </Link>
          <Link
            href="#"
            className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">chat_bubble</span>
            <span>Feedback</span>
          </Link>
          <ScrollToTopButton />
        </div>
      </div>
    </aside>
  );
}
