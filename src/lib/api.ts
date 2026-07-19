import type { WikiListItem, WikiRecord } from "./types";

export async function fetchWikis(): Promise<{ items: WikiListItem[]; roots: string[] }> {
  const res = await fetch("/api/wikis");
  if (!res.ok) throw new Error(`Failed to list wikis (${res.status})`);
  const data = await res.json();
  return { items: data.items || [], roots: data.roots || [] };
}

export async function fetchWiki(
  id: string,
): Promise<{ wiki: WikiRecord; handoffPrompt: string }> {
  const res = await fetch(`/api/wikis/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Wiki not found (${res.status})`);
  const data = await res.json();
  return { wiki: data.wiki, handoffPrompt: data.handoffPrompt || "" };
}

export function wikiApiBase(id: string): string {
  return `/api/wikis/${encodeURIComponent(id)}`;
}

export function orderedPageMetas(wiki: WikiRecord) {
  const byId = new Map((wiki.structure?.pages || []).map((p) => [p.id, p]));
  const ordered = [];
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
  for (const id of Object.keys(wiki.pages || {})) {
    if (!seen.has(id)) {
      ordered.push({ id, title: id.replace(/^page-/, "").replace(/-/g, " ") });
      seen.add(id);
    }
  }
  return ordered;
}
