/**
 * app/not-found.tsx — 404 Page
 * Shown when getDocBySlug() returns null for an unknown slug.
 */
import Link from "next/link";
import { getAllDocFiles } from "@/lib/docs";

export default function NotFound() {
  const firstFile = getAllDocFiles()[0];

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="text-center space-y-6 max-w-md">
        <p className="text-[11px] font-bold tracking-[0.3em] text-primary uppercase">
          404
        </p>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">
          Page Not Found
        </h1>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          The documentation page you&apos;re looking for doesn&apos;t exist or
          has been moved.
        </p>
        {firstFile && (
          <Link
            href={`/${firstFile.fullSlug}`}
            className="inline-block bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(60,221,199,0.3)] transition-all"
          >
            Go to Docs
          </Link>
        )}
      </div>
    </div>
  );
}
