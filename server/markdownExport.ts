import { zipSync, strToU8 } from "fflate";
import type { WikiPageMeta, WikiRecord } from "./scanWikis";

function slugify(title: string, fallback: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback;
}

export function orderedPages(wiki: WikiRecord): WikiPageMeta[] {
  const byId = new Map((wiki.structure?.pages || []).map((p) => [p.id, p]));
  const ordered: WikiPageMeta[] = [];
  const seen = new Set<string>();

  for (const section of wiki.structure?.sections || []) {
    for (const pageId of section.pages || []) {
      const meta = byId.get(pageId);
      if (meta && !seen.has(pageId)) {
        ordered.push(meta);
        seen.add(pageId);
      }
    }
  }

  for (const meta of wiki.structure?.pages || []) {
    if (!seen.has(meta.id)) {
      ordered.push(meta);
      seen.add(meta.id);
    }
  }

  // pages dict may have content without structure meta
  for (const id of Object.keys(wiki.pages || {})) {
    if (!seen.has(id)) {
      ordered.push({ id, title: id.replace(/^page-/, "").replace(/-/g, " ") });
      seen.add(id);
    }
  }

  return ordered;
}

export function pageSlug(meta: WikiPageMeta, index: number): string {
  const n = String(index + 1).padStart(2, "0");
  return `${n}-${slugify(meta.title, meta.id)}`;
}

function stripHtmlDetails(md: string): string {
  return md.replace(/<\/?details[^>]*>/gi, "").replace(/<\/?summary[^>]*>/gi, "");
}

export function pageMarkdown(wiki: WikiRecord, meta: WikiPageMeta, index: number): string {
  const content = wiki.pages?.[meta.id]?.content || "";
  const sources = (meta.filePaths || [])
    .map((f) => `- \`${f}\``)
    .join("\n");

  return [
    `# ${meta.title}`,
    "",
    meta.description ? `> ${meta.description}` : "",
    "",
    sources ? `### Source Files\n\n${sources}\n` : "",
    stripHtmlDetails(content).trim(),
    "",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}

export function buildLlmsTxt(wiki: WikiRecord, baseUrl: string): string {
  const pages = orderedPages(wiki);
  const lines = [
    `# ${wiki.structure.title}`,
    "",
    wiki.structure.description || "",
    "",
    `> Repo: ${wiki.owner || "local"}/${wiki.repo || "unknown"}`,
    "",
    "## Pages",
    "",
  ];
  pages.forEach((p, i) => {
    const slug = pageSlug(p, i);
    lines.push(`- [${p.title}](${baseUrl}/pages/${slug}.md): ${p.description || ""}`);
  });
  lines.push("");
  lines.push(`- [Full Markdown](${baseUrl}/llms-full.txt)`);
  lines.push(`- [Markdown alias](${baseUrl}.md)`);
  lines.push("");
  return lines.join("\n");
}

export function buildFullMarkdown(wiki: WikiRecord, baseUrl: string): string {
  const pages = orderedPages(wiki);
  const repo = `${wiki.owner || "local"}/${wiki.repo || "unknown"}`;
  const parts: string[] = [
    `# ${wiki.structure.title}`,
    "",
    wiki.structure.description ? `> ${wiki.structure.description}` : "",
    "",
    "## Context Links",
    "",
    `- [Agent index](${baseUrl}/llms.txt)`,
    `- [Human interactive wiki](${baseUrl.replace(/\/api\/wikis\/[^/]+$/, `/wiki/${wiki.id}`)})`,
    "",
    "## Repository Metadata",
    "",
    `- Repository: ${repo}`,
    `- Generated: ${wiki.generatedAt || wiki.createdAt || "unknown"}`,
    `- Updated: ${wiki.updatedAt || "unknown"}`,
    `- Runtime: ${wiki.runtimeModelLabel || wiki.runtime || "unknown"}`,
    `- Format: ${wiki.wikiStyle || "wiki"}`,
    `- Pages: ${pages.length}`,
    "",
    "## Page Index",
    "",
  ];

  pages.forEach((p, i) => {
    parts.push(
      `- ${String(i + 1).padStart(2, "0")}. [${p.title}](${baseUrl}/pages/${pageSlug(p, i)}.md) - ${p.description || ""}`,
    );
  });

  const allFiles = new Set<string>();
  for (const p of pages) for (const f of p.filePaths || []) allFiles.add(f);
  if (allFiles.size) {
    parts.push("", "## Source File Index", "");
    for (const f of [...allFiles].sort()) parts.push(`- \`${f}\``);
  }

  pages.forEach((p, i) => {
    parts.push("", "---", "", `## ${String(i + 1).padStart(2, "0")}. ${p.title}`, "");
    if (p.description) parts.push(`> ${p.description}`, "");
    parts.push(`- Page Markdown: ${baseUrl}/pages/${pageSlug(p, i)}.md`);
    if (wiki.pages?.[p.id]?.generatedAt) {
      parts.push(`- Generated: ${wiki.pages[p.id].generatedAt}`);
    }
    parts.push("");
    if (p.filePaths?.length) {
      parts.push("### Source Files", "");
      for (const f of p.filePaths) parts.push(`- \`${f}\``);
      parts.push("");
    }
    const raw = wiki.pages?.[p.id]?.content || "_No content._";
    parts.push(raw.trim(), "");
  });

  return parts.join("\n");
}

export function buildObsidianZip(wiki: WikiRecord): Uint8Array {
  const pages = orderedPages(wiki);
  const folder = slugify(wiki.structure.title, wiki.id);
  const files: Record<string, Uint8Array> = {};

  const indexLines = [
    `---`,
    `title: "${wiki.structure.title.replace(/"/g, '\\"')}"`,
    `repo: "${wiki.owner || "local"}/${wiki.repo || "unknown"}"`,
    `generated: ${wiki.generatedAt || ""}`,
    `---`,
    "",
    `# ${wiki.structure.title}`,
    "",
    wiki.structure.description || "",
    "",
    "## Pages",
    "",
  ];

  pages.forEach((p, i) => {
    const slug = pageSlug(p, i);
    const filename = `${folder}/${slug}.md`;
    const body = [
      `---`,
      `title: "${p.title.replace(/"/g, '\\"')}"`,
      `wiki: "${wiki.structure.title.replace(/"/g, '\\"')}"`,
      `---`,
      "",
      pageMarkdown(wiki, p, i),
    ].join("\n");
    files[filename] = strToU8(body);
    indexLines.push(`- [[${slug}|${p.title}]] — ${p.description || ""}`);
  });

  files[`${folder}/index.md`] = strToU8(indexLines.join("\n") + "\n");
  return zipSync(files, { level: 6 });
}

export function agentHandoffPrompt(wiki: WikiRecord): string {
  const pages = orderedPages(wiki);
  const repo = `${wiki.owner || "local"}/${wiki.repo || "unknown"}`;
  const pageList = pages
    .map((p, i) => `${i + 1}. ${p.title}${p.description ? ` — ${p.description}` : ""}`)
    .join("\n");

  return [
    `You are continuing work from a Grok-Wiki local preview of ${repo}.`,
    "",
    `Wiki title: ${wiki.structure.title}`,
    wiki.structure.description ? `Summary: ${wiki.structure.description}` : "",
    "",
    "Page outline:",
    pageList,
    "",
    "Use the wiki Markdown exports (llms-full.txt / Obsidian ZIP) as structured context.",
    "Stay grounded in cited source files when proposing changes.",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}
