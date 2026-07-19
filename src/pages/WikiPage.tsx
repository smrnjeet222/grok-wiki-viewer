import { useEffect, useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orderedPageMetas } from "../lib/api";
import { wikiDetailQuery } from "../lib/queries";
import { scrollToHash } from "../lib/scroll";
import type { WikiPageMeta, WikiRecord } from "../lib/types";
import { AgentHandoff, SharePanel } from "../components/SharePanel";
import { PageToc } from "../components/PageToc";
import {
  extractHeadings,
  normalizeWikiPageContent,
  WikiMarkdown,
} from "../components/WikiMarkdown";
import { WikiSidebar } from "../components/WikiSidebar";
import type { TocHeading } from "../lib/headings";

const routeApi = getRouteApi("/wiki/$id");

function PageBlock({
  page,
  wiki,
  index,
  total,
  mode,
  sectionTitle,
  tocHeadings,
  previousPage,
  nextPage,
  onSelectRelated,
}: {
  page: WikiPageMeta;
  wiki: WikiRecord;
  index: number;
  total: number;
  mode: "paged" | "continuous";
  sectionTitle?: string;
  tocHeadings?: TocHeading[];
  previousPage?: WikiPageMeta;
  nextPage?: WikiPageMeta;
  onSelectRelated: (id: string) => void;
}) {
  const content = wiki.pages?.[page.id]?.content || "_This page has no content yet._";
  const normalized = normalizeWikiPageContent(content, page.title);
  const headingOffset = mode === "continuous" ? 1 : 0;
  const idPrefix = mode === "continuous" ? `${page.id}--` : "";

  function pageHref(pageId: string): string {
    const params = new URLSearchParams({ page: pageId });
    if (mode === "continuous") params.set("mode", "continuous");
    return `?${params.toString()}`;
  }

  function relatedLink(related: WikiPageMeta, className?: string, label?: string) {
    return (
      <a
        key={related.id}
        href={pageHref(related.id)}
        className={className}
        onClick={(event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          onSelectRelated(related.id);
        }}
      >
        {label ? <span>{label}</span> : null}
        <strong>{related.title}</strong>
      </a>
    );
  }

  return (
    <article className="wiki-article" id={`wiki-page-${page.id}`}>
      <header className="article-header">
        <p className="page-kicker">
          {sectionTitle ? <span>{sectionTitle}</span> : null}
          <span>
            Page {index + 1} of {total}
          </span>
        </p>
        {mode === "continuous" ? (
          <h2 className="page-title">{page.title}</h2>
        ) : (
          <h1 className="page-title">{page.title}</h1>
        )}
        {page.description ? <p className="page-lede">{page.description}</p> : null}
      </header>

      {tocHeadings ? <PageToc headings={tocHeadings} variant="inline" /> : null}

      <div className="article-body">
        <WikiMarkdown
          content={normalized.body}
          headingOffset={headingOffset}
          idPrefix={idPrefix}
        />
      </div>

      {normalized.sourceDetails ||
      (page.filePaths && page.filePaths.length > 0) ||
      (page.relatedPages && page.relatedPages.length > 0) ? (
        <footer className="article-resources">
          {normalized.sourceDetails ? (
            <div className="references">
              <WikiMarkdown
                content={normalized.sourceDetails}
                headingOffset={headingOffset}
                idPrefix={idPrefix}
              />
            </div>
          ) : page.filePaths && page.filePaths.length > 0 ? (
            <details className="source-files">
              <summary>Relevant source files</summary>
              <ul>
                {page.filePaths.map((file) => (
                  <li key={file}>
                    <code>{file}</code>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {page.relatedPages && page.relatedPages.length > 0 ? (
            <nav className="related-pages" aria-label="Related pages">
              <h3>Continue exploring</h3>
              <div className="related-links">
                {page.relatedPages.map((id) => {
                  const related = wiki.structure.pages.find((candidate) => candidate.id === id);
                  return related ? relatedLink(related) : null;
                })}
              </div>
            </nav>
          ) : null}
        </footer>
      ) : null}

      {mode === "paged" && (previousPage || nextPage) ? (
        <nav className="page-pagination" aria-label="Adjacent wiki pages">
          {previousPage
            ? relatedLink(previousPage, "pagination-link previous", "Previous")
            : <span />}
          {nextPage ? relatedLink(nextPage, "pagination-link next", "Next") : <span />}
        </nav>
      ) : null}
    </article>
  );
}

export function WikiPage() {
  const { id } = routeApi.useParams();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  // Paged is default; continuous only when explicitly requested.
  const mode = search.mode === "continuous" ? "continuous" : "paged";
  const selectedPageId = search.page;

  const { data, error, isLoading } = useQuery(wikiDetailQuery(id));
  const wiki = data?.wiki ?? null;
  const handoff = data?.handoffPrompt ?? "";

  const [shareOpen, setShareOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mobileContentsOpen, setMobileContentsOpen] = useState(false);

  const pages = useMemo(() => (wiki ? orderedPageMetas(wiki) : []), [wiki]);
  const activePageId = selectedPageId || pages[0]?.id;
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const sectionsById = useMemo(
    () => new Map((wiki?.structure.sections || []).map((section) => [section.id, section.title])),
    [wiki],
  );

  const tocHeadings = useMemo(() => {
    if (!wiki || !activePage) return [];
    const content = wiki.pages?.[activePage.id]?.content || "";
    return extractHeadings(normalizeWikiPageContent(content, activePage.title).body);
  }, [wiki, activePage]);
  const scopedTocHeadings = useMemo(
    () =>
      mode === "continuous" && activePage
        ? tocHeadings.map((heading) => ({
            ...heading,
            id: `${activePage.id}--${heading.id}`,
          }))
        : tocHeadings,
    [activePage, mode, tocHeadings],
  );

  useEffect(() => {
    if (!wiki) return;
    document.title = `${activePage?.title || wiki.structure.title} · ${wiki.structure.title}`;
  }, [activePage, wiki]);

  useEffect(() => {
    if (isLoading || !wiki) return;
    const hash = window.location.hash;
    if (!hash) return;
    const t = window.setTimeout(() => {
      if (scrollToHash(hash, "auto") || mode !== "continuous" || !activePageId) return;
      const rawId = decodeURIComponent(hash.replace(/^#/, ""));
      scrollToHash(`#${activePageId}--${rawId}`, "auto");
    }, 50);
    return () => window.clearTimeout(t);
  }, [isLoading, wiki, activePageId, mode]);

  function selectPage(pageId: string) {
    if (mode === "continuous") {
      void navigate({
        search: { page: pageId, mode: "continuous" },
        replace: true,
      });
      window.requestAnimationFrame(() => {
        document.getElementById(`wiki-page-${pageId}`)?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    } else {
      void navigate({ search: { page: pageId } });
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }

  function setMode(nextMode: "continuous" | "paged") {
    const page = selectedPageId || activePageId;

    let nextHash = "";
    if (activePageId && window.location.hash) {
      const rawHash = decodeURIComponent(window.location.hash.slice(1));
      const prefix = `${activePageId}--`;
      nextHash =
        nextMode === "continuous"
          ? rawHash.startsWith(prefix)
            ? rawHash
            : `${prefix}${rawHash}`
          : rawHash.startsWith(prefix)
            ? rawHash.slice(prefix.length)
            : rawHash;
    }

    void navigate({
      search: {
        page,
        mode: nextMode === "continuous" ? "continuous" : undefined,
      },
      hash: nextHash || undefined,
    });
  }

  if (isLoading) {
    return (
      <main id="main-content" className="state-page" aria-live="polite">
        <div className="state-mark" aria-hidden="true" />
        <h1>Opening wiki</h1>
        <p>Preparing pages and diagrams…</p>
      </main>
    );
  }

  if (error || !wiki) {
    return (
      <main id="main-content" className="state-page" role="alert">
        <p className="eyebrow">Wiki unavailable</p>
        <h1>Couldn’t open this wiki</h1>
        <p>{error ? String(error) : "Wiki not found"}</p>
        <Link className="btn" to="/">
          Return to library
        </Link>
      </main>
    );
  }

  return (
    <div className="reader">
      <WikiSidebar
        wiki={wiki}
        pages={pages}
        currentPageId={activePageId}
        mode={mode}
        onSelect={selectPage}
        onModeChange={setMode}
        onAddAgent={() => {
          setAgentOpen(true);
          setShareOpen(false);
        }}
        onShare={() => {
          setShareOpen(true);
          setAgentOpen(false);
        }}
        mobileOpen={mobileContentsOpen}
        onMobileClose={() => setMobileContentsOpen(false)}
      />

      <div className="reader-column">
        <nav className="reader-mobilebar" aria-label="Reader controls">
          <button
            type="button"
            className="icon-btn"
            aria-haspopup="dialog"
            onClick={() => setMobileContentsOpen(true)}
          >
            <span aria-hidden="true">☰</span>
            <span>Contents</span>
          </button>
          <div className="mobile-page-context">
            <span>{wiki.structure.title}</span>
            <strong>{activePage?.title || "Wiki"}</strong>
          </div>
        </nav>

        <main id="main-content" className="reader-main" tabIndex={-1}>
          {mode === "continuous" ? (
            <header className="wiki-cover">
              <p className="eyebrow">
                {[wiki.owner, wiki.repo].filter(Boolean).join("/")} · {pages.length} pages
              </p>
              <h1>{wiki.structure.title}</h1>
              {wiki.structure.description ? <p>{wiki.structure.description}</p> : null}
            </header>
          ) : null}

          {pages.length === 0 ? (
            <section className="empty-state">
              <h1>This wiki has no pages yet</h1>
              <p>Regenerate the artifact to populate its reading surface.</p>
            </section>
          ) : mode === "continuous" ? (
            pages.map((page, index) => (
              <PageBlock
                key={page.id}
                page={page}
                wiki={wiki}
                index={index}
                total={pages.length}
                mode={mode}
                sectionTitle={
                  page.parentSection ? sectionsById.get(page.parentSection) : undefined
                }
                tocHeadings={page.id === activePageId ? scopedTocHeadings : undefined}
                onSelectRelated={selectPage}
              />
            ))
          ) : activePage ? (
            <PageBlock
              page={activePage}
              wiki={wiki}
              index={pages.findIndex((page) => page.id === activePage.id)}
              total={pages.length}
              mode={mode}
              sectionTitle={
                activePage.parentSection
                  ? sectionsById.get(activePage.parentSection)
                  : undefined
              }
              tocHeadings={scopedTocHeadings}
              previousPage={pages[pages.findIndex((page) => page.id === activePage.id) - 1]}
              nextPage={pages[pages.findIndex((page) => page.id === activePage.id) + 1]}
              onSelectRelated={selectPage}
            />
          ) : null}
        </main>
      </div>

      <PageToc headings={scopedTocHeadings} />
      <SharePanel
        wiki={wiki}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <AgentHandoff
        prompt={handoff}
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
      />
    </div>
  );
}
