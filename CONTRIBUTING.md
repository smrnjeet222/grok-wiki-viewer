# Contributing

Thanks for your interest in improving Grok-Wiki Viewer. It's a small, local-first
tool — contributions that keep it simple, offline-friendly, and fast are very welcome.

## Prerequisites

- [Bun](https://bun.sh) `>= 1.0`

## Setup

```bash
git clone https://github.com/smrnjeet/grok-wiki-viewer.git
cd grok-wiki-viewer
bun install
bun run dev
```

- Vite UI: http://127.0.0.1:5173
- Bun API: http://127.0.0.1:4173 (proxied at `/api`)

To test against real data, point the scanner at a folder containing
`**/wikis/wiki-*.json`:

```bash
GROK_WIKI_ROOT="$(pwd)/fixtures" bun run dev
```

Or just drag a `wiki-*.json` onto the library — no server data needed.

## Checks

Run these before opening a PR:

```bash
bun run typecheck   # tsc --noEmit
bun run build       # production build must succeed
```

## Project layout

```
src/       React app (Vite) — router.tsx, pages/, components/, lib/
server/    Bun API + disk scanner + Markdown exports
scripts/   dev runner (Vite + API together)
```

- Data fetching goes through TanStack Query (`src/lib/queries.ts`).
- Routing is TanStack Router (`src/router.tsx`).
- Keep the browser-only path working: the app must be usable with no server.

## Guidelines

- Match the existing code style; TypeScript strict mode is on.
- Keep it local-first — no telemetry, no required network calls.
- Prefer small, focused PRs with a clear description.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for messages
  (`feat:`, `fix:`, `docs:`, `refactor:`, …).

## Reporting issues

Open an issue at https://github.com/smrnjeet/grok-wiki-viewer/issues with steps
to reproduce and, if possible, a sample `wiki-*.json`.
