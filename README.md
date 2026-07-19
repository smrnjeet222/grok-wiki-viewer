# Local Wiki Preview

Read-only local preview of Grok-Wiki JSON artifacts — same reader surface as grok-wiki.com share links.

## Run

```bash
cd local-wiki-preview
bun install
bun run dev
```

Open **http://127.0.0.1:5173**

- Vite UI: `5173`
- Bun API: `4173` (proxied via `/api`)

Production:

```bash
bun run build
bun run start
```

Then open **http://127.0.0.1:4173**

## Data roots

Scans (deduped by wiki id):

1. `$GROK_WIKI_ROOT` or `$RLM_WIKI_ROOT`
2. `~/Library/Application Support/ai.grokwiki.desktop/grok-wiki/`
3. `~/.rlm-wiki/`

Looks for `**/wikis/wiki-*.json`.

## Features

- Library of all local wikis
- Continuous / paged reading
- Sidebar contents, on-this-page TOC
- Markdown + Mermaid zoom
- Related source files / related pages
- Share panel: local link, Markdown, llms.txt, Obsidian ZIP, print/PDF
- Add Agent handoff prompt copy
- System / light / dark themes with saved typography and reading-width preferences
