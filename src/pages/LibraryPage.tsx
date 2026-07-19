import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWikis } from "../lib/api";
import type { WikiListItem } from "../lib/types";

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
  const [items, setItems] = useState<WikiListItem[]>([]);
  const [roots, setRoots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Local Wikis · Grok-Wiki";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWikis();
        if (!cancelled) {
          setItems(data.items);
          setRoots(data.roots);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main id="main-content" className="state-page" aria-live="polite">
        <div className="state-mark" aria-hidden="true" />
        <h1>Scanning your library</h1>
        <p>Looking for local Grok-Wiki artifacts…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main id="main-content" className="state-page" role="alert">
        <p className="eyebrow">Library unavailable</p>
        <h1>Couldn’t scan local wikis</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main id="main-content" className="library" tabIndex={-1}>
      <header className="library-hero">
        <p className="eyebrow">Knowledge library</p>
        <h1>Local wikis, made readable.</h1>
        <p>
          Browse private Grok-Wiki artifacts on this machine with no publishing
          step and no data leaving your local environment.
        </p>
        <div className="library-summary">
          <span className="count-badge">
            {items.length} wiki{items.length === 1 ? "" : "s"}
          </span>
          {roots.length > 0 ? (
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
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <section className="empty-state" aria-labelledby="empty-library-title">
          <div className="empty-icon" aria-hidden="true">
            +
          </div>
          <h2 id="empty-library-title">No local wikis yet</h2>
          <p>
            Generate one with <code>grok-wiki generate</code> or open the desktop
            app. It will appear here automatically.
          </p>
        </section>
      ) : (
        <section className="wiki-grid" aria-label="Local wikis">
          {items.map((wiki) => (
            <Link key={wiki.id} className="wiki-card" to={`/wiki/${encodeURIComponent(wiki.id)}`}>
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
