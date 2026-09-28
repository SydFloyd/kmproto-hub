"use client";

import { useState } from "react";
import { EMAIL } from "../data";

export default function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };

  return (
    <button type="button" className="button button-ghost" onClick={copy}>
      <span aria-live="polite">{copied ? "Copied to clipboard ✓" : "Copy email address"}</span>
    </button>
  );
}
