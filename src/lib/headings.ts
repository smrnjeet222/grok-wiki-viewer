import GithubSlugger from "github-slugger";

export type TocHeading = { id: string; text: string; level: number };

export function normalizeHeadingText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build TOC headings with the same ids `rehype-slug` assigns (github-slugger).
 * Skips fenced code so `#` comments don't desync ids.
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  let inFence = false;

  for (const raw of markdown.split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (!m) continue;

    const text = normalizeHeadingText(m[2]);
    if (!text) continue;

    const id = slugger.slug(text);
    // Still consume slug for Summary so later ids stay aligned with rehype-slug.
    if (/^summary$/i.test(text)) continue;

    headings.push({ id, text, level: m[1].length });
  }

  return headings;
}
