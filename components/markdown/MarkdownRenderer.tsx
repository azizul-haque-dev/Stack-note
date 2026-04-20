import CopyButton from "@/components/ui/CopyButton";

interface MarkdownRendererProps {
  html: string;
}

export default function MarkdownRenderer({ html }: MarkdownRendererProps) {
  return (
    <>
      <article
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <CopyButton />
    </>
  );
}
