import type { CSSProperties } from "react";
import { handleHashLinkClick } from "../lib/scroll";
import type { TocHeading } from "../lib/headings";

function TocLinks({ headings }: { headings: TocHeading[] }) {
  const baseLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <ul>
      {headings.map((heading) => (
        <li
          key={`${heading.id}-${heading.text}`}
          style={{ "--toc-depth": heading.level - baseLevel } as CSSProperties}
        >
          <a href={`#${heading.id}`} onClick={handleHashLinkClick}>
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function PageToc({
  headings,
  variant = "rail",
}: {
  headings: TocHeading[];
  variant?: "rail" | "inline";
}) {
  if (headings.length === 0) return null;

  if (variant === "inline") {
    return (
      <details className="toc-inline">
        <summary>On this page</summary>
        <nav aria-label="On this page">
          <TocLinks headings={headings} />
        </nav>
      </details>
    );
  }

  return (
    <aside className="toc-rail" aria-label="Page outline">
      <nav aria-label="On this page">
        <h2>On this page</h2>
        <TocLinks headings={headings} />
      </nav>
    </aside>
  );
}
