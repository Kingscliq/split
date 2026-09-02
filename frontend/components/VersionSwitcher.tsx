"use client";

import { usePathname } from "next/navigation";

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

  return (
    <details className={`version-switcher${compact ? " compact" : ""}`}>
      <summary aria-label={`Current product version: ${currentVersion.toUpperCase()}`}>
        <span>{currentVersion.toUpperCase()}</span>
        <i aria-hidden="true">⌄</i>
      </summary>
      <div className="version-menu">
        <p>Experience version</p>
        {versions.map((version) => {
          const content = <><strong>{version.label}</strong><small>{version.description}</small></>;

          return version.id === currentVersion
            ? <span className="current" aria-current="page" key={version.id}>{content}<b>Current</b></span>
            : <a href={`${version.baseUrl.replace(/\/$/, "")}${pathname}`} key={version.id}>{content}<b>Open ↗</b></a>;
        })}
      </div>
    </details>
  );
}
