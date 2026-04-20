"use client";

export default function ScrollToTopButton() {
  return (
    <button
      className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <span className="material-symbols-outlined text-sm">arrow_upward</span>
      <span>Scroll to top</span>
    </button>
  );
}
