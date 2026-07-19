import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ingestWikiFiles, ingestWikiUrl, wikiKeys, wikiListQuery } from "../lib/queries";
import type { WikiListResult } from "../lib/api";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function LibraryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery(wikiListQuery);
  const items = data?.items ?? [];
  const roots = data?.roots ?? [];
  const serverAvailable = data?.serverAvailable ?? false;

  useEffect(() => {
    document.title = "Local Wikis · Grok-Wiki";
  }, []);

  const filesMutation = useMutation({
    mutationFn: (files: File[]) => ingestWikiFiles(files),
    onSuccess: ({ added, lastId }) => {
      queryClient.setQueryData<WikiListResult>(wikiKeys.list(), (prev) => {
        const base = prev ?? { items: [], roots: [], serverAvailable: false };
        const seen = new Set(added.map((item) => item.id));
        return {
          ...base,
          items: [...added, ...base.items.filter((item) => !seen.has(item.id))],
        };
      });
      if (added.length === 1 && lastId) {
        navigate({ to: "/wiki/$id", params: { id: lastId } });
      }
    },
    onError: (err) => setUploadError(err instanceof Error ? err.message : String(err)),
  });

  const urlMutation = useMutation({
    mutationFn: (url: string) => ingestWikiUrl(url),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: wikiKeys.list() });
      navigate({ to: "/wiki/$id", params: { id: item.id } });
    },
    onError: (err) => setUploadError(err instanceof Error ? err.message : String(err)),
  });

  function ingestFiles(files: FileList | File[]) {
    setUploadError(null);
    filesMutation.mutate([...files]);
  }

  function loadUrl() {
    const url = urlValue.trim();
    if (!url) return;
    setUploadError(null);
    urlMutation.mutate(url);
  }

  if (isLoading) {
    return (
      <main id="main-content" className="state-page" aria-live="polite">
        <div className="state-mark" aria-hidden="true" />
        <h1>Scanning your library</h1>
        <p>Looking for local Grok-Wiki artifacts…</p>
      </main>
    );
  }

  const openPanel = (
    <section className="open-wiki" aria-labelledby="open-wiki-title">
      <h2 id="open-wiki-title">Open a wiki file</h2>
      <p>Load a Grok-Wiki <code>wiki-*.json</code> artifact directly in your browser.</p>
      <div
        className={`dropzone${dragActive ? " is-active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          ingestFiles(event.dataTransfer.files);
        }}
      >
        <strong>Drag &amp; drop</strong>
        <span>or click to choose a wiki JSON</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) ingestFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="open-wiki-url">
        <label className="sr-only" htmlFor="wiki-url">
          Wiki JSON URL
        </label>
        <input
          id="wiki-url"
          type="url"
          inputMode="url"
          placeholder="https://…/wiki-example.json"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              loadUrl();
            }
          }}
        />
        <button
          type="button"
          className="btn primary"
          disabled={urlMutation.isPending}
          onClick={() => loadUrl()}
        >
          {urlMutation.isPending ? "Loading…" : "Load URL"}
        </button>
      </div>
      {uploadError ? (
        <p className="copy-status" role="alert">
          {uploadError}
        </p>
      ) : null}
    </section>
  );

  return (
    <main id="main-content" className="library" tabIndex={-1}>
      <header className="library-hero">
        <p className="eyebrow">Knowledge library</p>
        <h1>
          Local wikis,
          <br />
          made readable.
        </h1>
        <p>
          Browse Grok-Wiki artifacts in a clean reader. Load a file directly in
          your browser, or connect to a running Grok-Wiki server.
        </p>
        <div className="library-summary">
          <span className="count-badge">
            {items.length} wiki{items.length === 1 ? "" : "s"}
          </span>
          {serverAvailable && roots.length > 0 ? (
            <details className="scan-roots">
              <summary>
                Scanning {roots.length} location{roots.length === 1 ? "" : "s"}
              </summary>
              <ul>
                {roots.map((root) => (
                  <li key={root}>
                    <code>{root.replace(/(^\/Users\/[^/]+)/, "~")}</code>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span className="secondary-meta">
              {serverAvailable ? "Server connected" : "No server — upload a file to read"}
            </span>
          )}
        </div>
      </header>

      {openPanel}

      {items.length === 0 ? (
        <section className="empty-state" aria-labelledby="empty-library-title">
          <div className="empty-icon" aria-hidden="true">
            +
          </div>
          <h2 id="empty-library-title">No wikis loaded yet</h2>
          <p>
            Drop a <code>wiki-*.json</code> above, or generate one with{" "}
            <code>grok-wiki generate</code> and run the local server.
          </p>
        </section>
      ) : (
        <section className="wiki-grid" aria-label="Available wikis">
          {items.map((wiki) => (
            <Link key={wiki.id} className="wiki-card" to="/wiki/$id" params={{ id: wiki.id }}>
              <div className="wiki-card-topline">
                <span>{wiki.repository}</span>
                <span aria-hidden="true">↗</span>
              </div>
              <div className="wiki-card-copy">
                <h2>{wiki.title}</h2>
                <p>{wiki.description || "No description available."}</p>
              </div>
              <footer className="wiki-card-meta">
                <span>{wiki.pageCount} pages</span>
                <span>
                  Updated{" "}
                  {wiki.updatedAt ? (
                    <time dateTime={wiki.updatedAt}>{formatDate(wiki.updatedAt)}</time>
                  ) : (
                    "—"
                  )}
                </span>
                {wiki.runtime ? <span className="secondary-meta">{wiki.runtime}</span> : null}
                {wiki.style ? <span className="secondary-meta">{wiki.style}</span> : null}
              </footer>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
