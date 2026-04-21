import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackNote | Pro Markdown Viewer",
  description:
    "The premium markdown experience. A digital sanctuary for high-end technical writing.",
  keywords: [
    "markdown",
    "editor",
    "stackNote",
    "technical writing",
    "documentation"
  ],
  openGraph: {
    title: "StackNote | Pro Markdown Viewer",
    description:
      "The premium markdown experience. A digital sanctuary for high-end technical writing.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Space+Grotesk:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body hide-scrollbar text-on-surface antialiased bg-black">
        {children}
      </body>
    </html>
  );
}
