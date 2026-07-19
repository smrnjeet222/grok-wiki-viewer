import type { WikiListItem, WikiRecord } from "./types";
import { agentHandoffPrompt, isWikiRecord, wikiListItemFromRecord } from "./wikiExport";

const API_BASE_KEY = "wiki:apiBase";
const IDB_NAME = "grok-wiki";
const IDB_STORE = "wikis";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function envApiBase(): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = env?.VITE_API_BASE;
  return value ? stripTrailingSlash(value) : undefined;
}

/** Resolve the API base: build-time env > saved runtime override > same-origin `/api`. */
export function getApiBase(): string {
  const fromEnv = envApiBase();
  if (fromEnv) return fromEnv;
  try {
    const saved = localStorage.getItem(API_BASE_KEY);
    if (saved) return stripTrailingSlash(saved);
  } catch {
    /* localStorage unavailable */
  }
  return "/api";
}

export function setApiBase(base: string | null): void {
  try {
    if (base) localStorage.setItem(API_BASE_KEY, stripTrailingSlash(base));
    else localStorage.removeItem(API_BASE_KEY);
  } catch {
    /* ignore */
  }
}

// --- In-browser uploaded wikis (upload / URL, persisted in IndexedDB) ---

const uploaded = new Map<string, WikiRecord>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

function idbGetAll(): Promise<WikiRecord[]> {
  return openDb().then(
    (db) =>
      new Promise<WikiRecord[]>((resolve) => {
        if (!db) return resolve([]);
        const request = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
        request.onsuccess = () => resolve(request.result as WikiRecord[]);
        request.onerror = () => resolve([]);
      }),
  );
}

function idbPut(wiki: WikiRecord): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        if (!db) return resolve();
        const request = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).put(wiki);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      }),
  );
}

let hydratePromise: Promise<void> | null = null;

/** Load persisted wikis from IndexedDB into the in-memory cache once. */
function hydrate(): Promise<void> {
  hydratePromise ||= idbGetAll().then((all) => {
    for (const wiki of all) if (isWikiRecord(wiki)) uploaded.set(wiki.id, wiki);
  });
  return hydratePromise;
}

export async function storeUploadedWiki(wiki: WikiRecord): Promise<WikiListItem> {
  uploaded.set(wiki.id, wiki);
  await idbPut(wiki);
  return wikiListItemFromRecord(wiki, "uploaded");
}

export function getUploadedWiki(id: string): WikiRecord | undefined {
  return uploaded.get(id);
}

function listUploaded(): WikiListItem[] {
  return [...uploaded.values()].map((wiki) => wikiListItemFromRecord(wiki, "uploaded"));
}

/** Parse arbitrary text as a wiki JSON, validating shape. */
export function parseWikiJson(text: string): WikiRecord {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (!isWikiRecord(data)) {
    throw new Error("Not a Grok-Wiki artifact (missing id / structure / pages).");
  }
  return data;
}

export async function loadWikiFromUrl(url: string): Promise<WikiListItem> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
  const wiki = parseWikiJson(await res.text());
  return await storeUploadedWiki(wiki);
}

// --- Fetch API ---

export interface WikiListResult {
  items: WikiListItem[];
  roots: string[];
  serverAvailable: boolean;
}

export async function fetchWikis(): Promise<WikiListResult> {
  await hydrate();
  const uploadedItems = listUploaded();
  try {
    const res = await fetch(`${getApiBase()}/wikis`);
    if (!res.ok) throw new Error(`Failed to list wikis (${res.status})`);
    const data = await res.json();
    const serverItems: WikiListItem[] = data.items || [];
    const seen = new Set(uploadedItems.map((item) => item.id));
    const merged = [...uploadedItems, ...serverItems.filter((item) => !seen.has(item.id))];
    return { items: merged, roots: data.roots || [], serverAvailable: true };
  } catch {
    return { items: uploadedItems, roots: [], serverAvailable: false };
  }
}

export async function fetchWiki(
  id: string,
): Promise<{ wiki: WikiRecord; handoffPrompt: string }> {
  await hydrate();
  const local = getUploadedWiki(id);
  if (local) {
    return { wiki: local, handoffPrompt: agentHandoffPrompt(local) };
  }
  const res = await fetch(`${getApiBase()}/wikis/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Wiki not found (${res.status})`);
  const data = await res.json();
  const wiki: WikiRecord = data.wiki;
  return { wiki, handoffPrompt: data.handoffPrompt || agentHandoffPrompt(wiki) };
}

export function wikiApiBase(id: string): string {
  return `${getApiBase()}/wikis/${encodeURIComponent(id)}`;
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
