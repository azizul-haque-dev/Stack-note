/**
 * CodeBlock — Server Component shell
 *
 * Dracula-themed VS Code-style code block:
 * - #282a36 background (official Dracula bg)
 * - #44475a header / border (Dracula "current line")
 * - Traffic-light dots with authentic macOS colors
 * - Language badge with Dracula purple tint
 * - Line numbers column
 * - CopyButton (Client Component island)
 */

import CopyButton from "@/components/ui/CopyButton";

interface CodeBlockProps {
  language: string;
  /** Raw code string — passed to CopyButton for clipboard */
  code: string;
  /** Pre-highlighted HTML from lib/highlighter.ts */
  highlightedHtml: string;
}

export default function CodeBlock({ language, code, highlightedHtml }: CodeBlockProps) {
  const lines = code.split("\n");

  return (
    <div
      className="code-block-wrapper my-8 overflow-hidden shadow-2xl"
      style={{
        borderRadius: "10px",
        border: "1px solid #44475a",
        background: "#282a36",
      }}
    >
      {/* ── Title bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#21222c",
          borderBottom: "1px solid #44475a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "42px",
          gap: "12px",
        }}
      >
        {/* Left: traffic-light dots + language */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* macOS traffic-light dots — authentic colors */}
          <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
            <div
              title="Close"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#ff5f57",
                border: "1px solid rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            />
            <div
              title="Minimize"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#ffbd2e",
                border: "1px solid rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            />
            <div
              title="Maximize"
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#28c840",
                border: "1px solid rgba(0,0,0,0.15)",
                flexShrink: 0,
              }}
            />
          </div>

          {/* Language badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(189,147,249,0.12)",
              border: "1px solid rgba(189,147,249,0.25)",
              borderRadius: "5px",
              padding: "2px 10px",
            }}
          >
            {/* File-type icon dot */}
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#bd93f9",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#bd93f9",
                textTransform: "uppercase",
              }}
            >
              {language}
            </span>
          </div>
        </div>

        {/* Right: copy button */}
        <CopyButton code={code} />
      </div>

      {/* ── Code body ───────────────────────────────────────────────────── */}
      <div style={{ overflowX: "auto", background: "#282a36" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontFamily: "'Space Grotesk', 'Cascadia Code', 'Fira Code', monospace",
            fontSize: "13.5px",
            lineHeight: "1.7",
          }}
        >
          <tbody>
            {lines.map((_, i) => {
              // We render the highlighted line HTML per-row
              const lineHtml = highlightedHtml.split("\n")[i] ?? "";
              return (
                <tr
                  key={i}
                  style={{ verticalAlign: "top" }}
                  className="code-row"
                >
                  {/* Line number gutter */}
                  <td
                    style={{
                      userSelect: "none",
                      textAlign: "right",
                      paddingRight: "20px",
                      paddingLeft: "20px",
                      paddingTop: "0",
                      paddingBottom: "0",
                      color: "#6272a4",
                      fontSize: "12px",
                      fontFamily: "'Space Grotesk', monospace",
                      minWidth: "48px",
                      borderRight: "1px solid #44475a",
                      background: "#21222c",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i + 1}
                  </td>
                  {/* Code cell */}
                  <td
                    style={{
                      paddingLeft: "24px",
                      paddingRight: "24px",
                      paddingTop: "0",
                      paddingBottom: "0",
                      whiteSpace: "pre",
                      color: "#f8f8f2",
                    }}
                    dangerouslySetInnerHTML={{ __html: lineHtml || "&nbsp;" }}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Top + bottom padding rows */}
        <div style={{ height: "14px", background: "#282a36" }} />
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#191a21",
          borderTop: "1px solid #44475a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', monospace",
              fontSize: "10px",
              color: "#6272a4",
              letterSpacing: "0.05em",
            }}
          >
            UTF-8
          </span>
          <span
            style={{
              fontFamily: "'Space Grotesk', monospace",
              fontSize: "10px",
              color: "#6272a4",
              letterSpacing: "0.05em",
            }}
          >
            LF
          </span>
        </div>
        <span
          style={{
            fontFamily: "'Space Grotesk', monospace",
            fontSize: "10px",
            color: "#6272a4",
            letterSpacing: "0.05em",
          }}
        >
          {lines.length} lines
        </span>
      </div>
    </div>
  );
}
