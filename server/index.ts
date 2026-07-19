import { join } from "node:path";
import {
  agentHandoffPrompt,
  buildFullMarkdown,
  buildLlmsTxt,
  buildObsidianZip,
  orderedPages,
  pageMarkdown,
  pageSlug,
} from "./markdownExport";
import { listFromIndex, loadWiki, scanWikis, wikiRoots } from "./scanWikis";

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const isProd = process.env.NODE_ENV === "production";
const distDir = join(import.meta.dir, "..", "dist");

// Allow a static-hosted frontend (tunnel / VPS / CDN) to call this API cross-origin.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": CORS_ORIGIN,
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function withCors(res: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) res.headers.set(key, value);
  return res;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function text(body: string, contentType = "text/plain; charset=utf-8", status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": contentType, "cache-control": "no-store" },
  });
}

function baseUrlFor(req: Request, wikiId: string): string {
  const url = new URL(req.url);
  return `${url.origin}/api/wikis/${encodeURIComponent(wikiId)}`;
}

async function handleApi(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/api/health") {
    return json({ ok: true, roots: wikiRoots() });
  }

  if (path === "/api/wikis") {
    const index = await scanWikis();
    return json({ ok: true, items: listFromIndex(index), roots: wikiRoots() });
  }

  // /api/wikis/:id | /api/wikis/:id.md | /api/wikis/:id/...
  const m = path.match(/^\/api\/wikis\/([^/]+?)(?:(\.md)|(\/.*))?$/);
  if (!m) return json({ ok: false, error: "not found" }, 404);

  const id = decodeURIComponent(m[1]);
  const isMdAlias = Boolean(m[2]);
  const rest = m[3] || "";

  const loaded = await loadWiki(id);
  if (!loaded) return json({ ok: false, error: `wiki not found: ${id}` }, 404);
  const { wiki } = loaded;
  const base = baseUrlFor(req, id);

  if (!isMdAlias && (rest === "" || rest === "/")) {
    return json({ ok: true, wiki, handoffPrompt: agentHandoffPrompt(wiki) });
  }

  if (isMdAlias || rest === "/llms-full.txt") {
    return text(buildFullMarkdown(wiki, base), "text/markdown; charset=utf-8");
  }

  if (rest === "/llms.txt") {
    return text(buildLlmsTxt(wiki, base), "text/plain; charset=utf-8");
  }

  if (rest === "/handoff.txt") {
    return text(agentHandoffPrompt(wiki), "text/plain; charset=utf-8");
  }

  if (rest === "/export/obsidian.zip") {
    const zip = buildObsidianZip(wiki);
    const filename = `${wiki.id}-obsidian.zip`;
    return new Response(Buffer.from(zip), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  }

  const pageMatch = rest.match(/^\/pages\/([^/]+)\.md$/);
  if (pageMatch) {
    const slug = decodeURIComponent(pageMatch[1]);
    const pages = orderedPages(wiki);
    const idx = pages.findIndex((p, i) => pageSlug(p, i) === slug || p.id === slug);
    if (idx < 0) return text("page not found\n", "text/plain; charset=utf-8", 404);
    return text(pageMarkdown(wiki, pages[idx], idx), "text/markdown; charset=utf-8");
  }

  return json({ ok: false, error: "not found" }, 404);
}

async function handleStatic(url: URL): Promise<Response> {
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";

  const filePath = join(distDir, pathname);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }

  // SPA fallback
  const index = Bun.file(join(distDir, "index.html"));
  if (await index.exists()) return new Response(index);
  return text("Build the web app first: bun run build\n", "text/plain; charset=utf-8", 404);
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        return withCors(await handleApi(req, url));
      } catch (err) {
        console.error(err);
        return withCors(json({ ok: false, error: String(err) }, 500));
      }
    }
    if (isProd) return handleStatic(url);
    return text("Dev mode: use Vite on http://127.0.0.1:5173 (proxies /api here)\n");
  },
});

console.log(`local-wiki-preview API http://${HOST}:${server.port}`);
console.log(`scanning roots:\n  - ${wikiRoots().join("\n  - ")}`);
