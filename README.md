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

## Deploy live

The frontend is a static SPA; the Bun server is optional. Three modes:

### 1. Static + upload (no server)

Host `dist/` on any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

```bash
bun install
bun run build   # outputs dist/
```

- SPA fallback is preconfigured: `vercel.json` (Vercel) and `public/_redirects` (Netlify / Cloudflare Pages).
- Visitors open a wiki by dragging a `wiki-*.json` onto the library, or pasting a URL to one. All exports (Markdown, `llms.txt`, Obsidian ZIP, handoff) are generated in the browser.
- GitHub Pages under a subpath: build with `VITE_BASE=/your-repo/ bun run build`.

Note: a public HTTPS site cannot read a visitor's disk or reach `http://127.0.0.1` (mixed-content + Private Network Access). Live local data therefore needs mode 2 or 3.

### 2. Static + remote API (tunnel or VPS)

Build the static site pointed at a running Grok-Wiki server over HTTPS:

```bash
VITE_API_BASE=https://your-tunnel.example/api bun run build
```

Expose your local server with an HTTPS tunnel (`cloudflared tunnel --url http://127.0.0.1:4173`, `ngrok http 4173`) or run it on a VPS. CORS is enabled (`CORS_ORIGIN`, default `*`).

### 3. Self-hosted Bun server (Docker)

Serves the built frontend and the API together.

```bash
docker build -t wiki-reader .
docker run -p 4173:4173 -v /path/to/wikis:/data/wikis -e GROK_WIKI_ROOT=/data/wikis wiki-reader
```

Works on Fly.io / Railway / Render / any VPS. Configurable via `HOST`, `PORT`, `CORS_ORIGIN`, `GROK_WIKI_ROOT`.

## Features

- Library of all local wikis, plus in-browser upload / URL loading
- Continuous / paged reading
- Sidebar contents, on-this-page TOC
- Markdown + Mermaid zoom
- Related source files / related pages
- Share panel: local link, Markdown, llms.txt, Obsidian ZIP, print/PDF
- Add Agent handoff prompt copy
- System / light / dark themes with saved typography and reading-width preferences
