"use client";

import { useEffect, useState } from "react";

interface CopyButtonProps {
  code?: string;
}

const RESET_DELAY_MS = 1600;

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const didCopy = document.execCommand("copy");
      document.body.removeChild(textarea);
      return didCopy;
    } catch {
      return false;
    }
  }
}

function decodeBase64(value: string): string {
  try {
    const binary = window.atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function setDelegatedButtonState(button: HTMLButtonElement, state: "idle" | "copied" | "error") {
  const label = button.querySelector<HTMLElement>("[data-copy-label]");
  if (!label) return;

  label.textContent = state === "copied" ? "COPIED" : state === "error" ? "FAILED" : "COPY";
  button.dataset.copyState = state;
}

function InlineCopyButton({ code = "" }: { code?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    const success = await copyText(code);
    setState(success ? "copied" : "error");
    window.setTimeout(() => setState("idle"), RESET_DELAY_MS);
  }

  return (
    <button
      type="button"
      className="md-code-block__copy"
      onClick={handleCopy}
      data-copy-state={state}
      aria-label={state === "copied" ? "Copied code to clipboard" : "Copy code to clipboard"}
    >
      <span className="md-code-block__copy-label">
        {state === "copied" ? "COPIED" : state === "error" ? "FAILED" : "COPY"}
      </span>
    </button>
  );
}

export default function CopyButton({ code }: CopyButtonProps) {
  useEffect(() => {
    if (code !== undefined) return;

    const timers = new WeakMap<HTMLButtonElement, number>();

    async function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("[data-copy-code]");
      if (!button) return;

      const encoded = button.dataset.copyCode ?? "";
      const decoded = decodeBase64(encoded);
      const success = decoded ? await copyText(decoded) : false;

      const existingTimer = timers.get(button);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      setDelegatedButtonState(button, success ? "copied" : "error");

      const timer = window.setTimeout(() => {
        setDelegatedButtonState(button, "idle");
      }, RESET_DELAY_MS);

      timers.set(button, timer);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [code]);

  if (code === undefined) {
    return null;
  }

  return <InlineCopyButton code={code} />;
}
