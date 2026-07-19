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
}

export interface WikiRecord {
  id: string;
  owner?: string;
  repo?: string;
  repoUrl?: string;
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
