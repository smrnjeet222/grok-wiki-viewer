import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, basename } from "node:path";

export interface WikiPageMeta {
  id: string;
  title: string;
  description?: string;
  importance?: string;
  filePaths?: string[];
  relatedPages?: string[];
  parentSection?: string;
}

export interface WikiSection {
  id: string;
  title: string;
  pages: string[];
  subsections?: string[];
}

export interface WikiStructure {
  title: string;
  description?: string;
  sections?: WikiSection[];
  pages: WikiPageMeta[];
}

export interface WikiPageContent {
  id: string;
  content: string;
  generatedAt?: string;
  status?: string;
}

export interface WikiRecord {
  id: string;
  owner?: string;
  repo?: string;
  repoUrl?: string;
  branch?: string | null;
  sourceKey?: string;
  createdAt?: string;
  updatedAt?: string;
  generatedAt?: string;
  model?: string;
  runtime?: string;
  runtimeModelLabel?: string;
  wikiPageCount?: number;
  wikiStyle?: string;
  structure: WikiStructure;
  pages: Record<string, WikiPageContent>;
}

export interface WikiListItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  repo: string;
  repository: string;
  pageCount: number;
  updatedAt: string | null;
  generatedAt: string | null;
  runtime: string | null;
  style: string | null;
  path: string;
}

interface IndexedWiki {
  item: WikiListItem;
  path: string;
  mtimeMs: number;
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

export function wikiRoots(): string[] {
  const roots: string[] = [];
  const envRoot = process.env.GROK_WIKI_ROOT || process.env.RLM_WIKI_ROOT;
  if (envRoot) roots.push(expandHome(envRoot));

  roots.push(
    join(homedir(), "Library/Application Support/ai.grokwiki.desktop/grok-wiki"),
    join(homedir(), ".rlm-wiki"),
  );

  return [...new Set(roots)];
}

async function* walkJson(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "slide-viewers" ||
        entry.name === ".git"
      ) {
        continue;
      }
      yield* walkJson(full);
    } else if (entry.isFile() && /^wiki-.*\.json$/i.test(entry.name)) {
      yield full;
    }
  }
}

function toListItem(wiki: WikiRecord, path: string): WikiListItem {
  const owner = wiki.owner || "local";
  const repo = wiki.repo || "unknown";
  return {
    id: wiki.id,
    title: wiki.structure?.title || `${owner}/${repo}`,
    description: wiki.structure?.description || "",
    owner,
    repo,
    repository: `${owner}/${repo}`,
    pageCount:
      wiki.wikiPageCount ||
      Object.keys(wiki.pages || {}).length ||
      wiki.structure?.pages?.length ||
      0,
    updatedAt: wiki.updatedAt || wiki.generatedAt || null,
    generatedAt: wiki.generatedAt || null,
    runtime: wiki.runtimeModelLabel || wiki.runtime || null,
    style: wiki.wikiStyle || null,
    path,
  };
}

export async function scanWikis(): Promise<Map<string, IndexedWiki>> {
  const byId = new Map<string, IndexedWiki>();

  for (const root of wikiRoots()) {
    for await (const filePath of walkJson(root)) {
      if (!/[/\\]wikis[/\\]/.test(filePath)) continue;
      // skip product artifact copies that aren't full wiki docs
      if (filePath.includes(`${"/"}product${"/"}`)) continue;

      let wiki: WikiRecord;
      try {
        wiki = (await Bun.file(filePath).json()) as WikiRecord;
      } catch {
        continue;
      }
      if (!wiki?.id || !wiki.structure || !wiki.pages) continue;

      const stat = await Bun.file(filePath).stat().catch(() => null);
      const rawMtime = stat?.mtime as Date | number | undefined;
      const mtimeMs =
        rawMtime instanceof Date ? rawMtime.getTime() : Number(rawMtime ?? 0);
      const item = toListItem(wiki, filePath);
      const prev = byId.get(wiki.id);
      if (!prev || mtimeMs >= prev.mtimeMs) {
        byId.set(wiki.id, { item, path: filePath, mtimeMs });
      }
    }
  }

  return byId;
}

export async function loadWiki(id: string): Promise<{ wiki: WikiRecord; path: string } | null> {
  const index = await scanWikis();
  const hit = index.get(id);
  if (!hit) return null;
  const wiki = (await Bun.file(hit.path).json()) as WikiRecord;
  return { wiki, path: hit.path };
}

export async function loadWikiByPath(path: string): Promise<WikiRecord> {
  return (await Bun.file(path).json()) as WikiRecord;
}

export function listFromIndex(index: Map<string, IndexedWiki>): WikiListItem[] {
  return [...index.values()]
    .map((x) => x.item)
    .sort((a, b) => {
      const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return tb - ta;
    });
}

export function wikiBasename(path: string): string {
  return basename(path);
}
