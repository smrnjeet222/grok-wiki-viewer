import { queryOptions } from "@tanstack/react-query";
import {
  fetchWiki,
  fetchWikis,
  loadWikiFromUrl,
  parseWikiJson,
  storeUploadedWiki,
} from "./api";
import type { WikiListItem, WikiRecord } from "./types";

export const wikiKeys = {
  all: ["wikis"] as const,
  list: () => [...wikiKeys.all, "list"] as const,
  detail: (id: string) => [...wikiKeys.all, "detail", id] as const,
};

export const wikiListQuery = queryOptions({
  queryKey: wikiKeys.list(),
  queryFn: () => fetchWikis(),
});

export function wikiDetailQuery(id: string) {
  return queryOptions({
    queryKey: wikiKeys.detail(id),
    queryFn: () => fetchWiki(id),
    enabled: id.length > 0,
  });
}

export interface IngestFilesResult {
  added: WikiListItem[];
  lastId: string;
}

export async function ingestWikiFiles(files: File[]): Promise<IngestFilesResult> {
  const list = files.filter((file) => file.name.endsWith(".json"));
  if (list.length === 0) {
    throw new Error("Drop a wiki-*.json file.");
  }
  const added: WikiListItem[] = [];
  let lastId = "";
  for (const file of list) {
    const wiki: WikiRecord = parseWikiJson(await file.text());
    added.push(await storeUploadedWiki(wiki));
    lastId = wiki.id;
  }
  return { added, lastId };
}

export async function ingestWikiUrl(url: string): Promise<WikiListItem> {
  return loadWikiFromUrl(url);
}
