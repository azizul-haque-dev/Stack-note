/**
 * app/page.tsx — Homepage
 *
 * Redirects to the first available documentation page.
 * This keeps the root URL useful without duplicating layout logic.
 */

import { redirect } from "next/navigation";
import { getAllDocFiles } from "@/lib/docs";

export default function HomePage() {
  const allFiles = getAllDocFiles();

  if (allFiles.length > 0) {
    redirect(`/${allFiles[0].fullSlug}`);
  }

  // Fallback if docs/ is empty
  return (
    <main className="flex items-center justify-center min-h-screen">
      <p className="text-on-surface-variant text-sm">
        No documentation found. Add <code>.md</code> files to the{" "}
        <code>/docs</code> folder.
      </p>
    </main>
  );
}
