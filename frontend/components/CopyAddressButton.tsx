"use client";

import { useState } from "react";
import { shortAddress } from "@/lib/split-contract";

type CopyAddressButtonProps = {
  address: string;
  className?: string;
  label?: string;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Clipboard copy failed.");
}

export function CopyAddressButton({ address, className = "", label }: CopyAddressButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await copyText(address);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    window.setTimeout(() => setStatus("idle"), 2200);
  }

  const text =
    status === "copied"
      ? "Copied ✓"
      : status === "failed"
        ? "Copy failed"
        : (label ?? shortAddress(address));

  return (
    <button
      type="button"
      className={`copy-address ${status} ${className}`.trim()}
      title={address}
      aria-label={status === "copied" ? "Wallet address copied" : `Copy wallet address ${address}`}
      onClick={() => void copy()}
    >
      <span>{text}</span>
      {status === "idle" && <i aria-hidden="true">⧉</i>}
    </button>
  );
}
