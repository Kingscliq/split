"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SplitVersion = "v1" | "v2";

const currentVersion: SplitVersion = process.env.NEXT_PUBLIC_SPLIT_VERSION === "v2" ? "v2" : "v1";

const versions: Array<{ id: SplitVersion; label: string; description: string; baseUrl: string }> = [
  {
    id: "v1",
    label: "V1",
    description: "Initial tested experience",
    baseUrl: process.env.NEXT_PUBLIC_SPLIT_V1_URL ?? "https://split-v1.vercel.app",
  },
  {
    id: "v2",
    label: "V2",
    description: "Feedback-driven redesign",
    baseUrl: process.env.NEXT_PUBLIC_SPLIT_V2_URL ?? "https://split-zig.vercel.app",
  },
];

export function VersionSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className={`version-switcher${compact ? " compact" : ""}${isOpen ? " open" : ""}`} ref={switcherRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="version-trigger"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="version-trigger-copy">
          <small>Experience</small>
          <strong>{currentVersion.toUpperCase()}</strong>
        </span>
        <i aria-hidden="true">⌄</i>
      </button>
      {isOpen ? <div className="version-menu" role="menu">
        <p>Select product version</p>
        {versions.map((version) => {
          const content = <><strong>{version.label}</strong><small>{version.description}</small></>;

          return version.id === currentVersion
            ? <span className="current" aria-current="page" key={version.id}>{content}<b>Current</b></span>
            : <a href={`${version.baseUrl.replace(/\/$/, "")}${pathname}`} key={version.id}>{content}<b>Open ↗</b></a>;
        })}
      </div> : null}
    </div>
  );
}
