import { useEffect, useRef, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { WikiPageMeta, WikiRecord } from "../lib/types";

function formatDate(value?: string): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function WikiSidebar({
  wiki,
  pages,
  currentPageId,
  mode,
  onSelect,
  onModeChange,
  onAddAgent,
  onShare,
  mobileOpen,
  onMobileClose,
}: {
  wiki: WikiRecord;
  pages: WikiPageMeta[];
  currentPageId?: string;
  mode: "paged" | "continuous";
  onSelect: (pageId: string) => void;
  onModeChange: (mode: "paged" | "continuous") => void;
  onAddAgent: () => void;
  onShare: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const sections = wiki.structure.sections || [];
  const sectionPageIds = new Set(sections.flatMap((s) => s.pages || []));
  const orphans = pages.filter((p) => !sectionPageIds.has(p.id));
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const mobileReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) {
      mobileReturnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  function pageHref(pageId: string): string {
    const params = new URLSearchParams({ page: pageId });
    if (mode === "continuous") params.set("mode", "continuous");
    return `?${params.toString()}`;
  }

  function pageLink(page: WikiPageMeta, closeAfter = false) {
    const active = currentPageId === page.id;
    return (
      <a
        key={page.id}
        href={pageHref(page.id)}
        className={`nav-page ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          onSelect(page.id);
          if (closeAfter) mobileDialogRef.current?.close();
        }}
      >
        <span>{page.title}</span>
      </a>
    );
  }

  function sidebarContent(closeAfter = false, mobile = false) {
    return (
      <>
        <div className="sidebar-header">
          <div>
            <Link to="/" className="sidebar-back">
              Library
            </Link>
            <h2>{wiki.structure.title}</h2>
            <p>{[wiki.owner, wiki.repo].filter(Boolean).join("/")}</p>
          </div>
          {mobile ? (
            <button
              type="button"
              className="icon-btn close-btn"
              aria-label="Close contents"
              onClick={() => mobileDialogRef.current?.close()}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>

        <nav className="sidebar-nav" aria-label="Wiki contents">
          <h3>Contents</h3>
          {sections.length === 0 ? (
            <div className="nav-pages">{pages.map((page) => pageLink(page, closeAfter))}</div>
          ) : (
            <div className="nav-sections">
              {sections.map((section) => {
                const sectionPages = (section.pages || [])
                  .map((pageId) => byId.get(pageId))
                  .filter((page): page is WikiPageMeta => Boolean(page));
                const active = sectionPages.some((page) => page.id === currentPageId);
                return (
                  <details key={section.id} className="nav-section" open={active || sections.length <= 3}>
                    <summary>{section.title}</summary>
                    <div className="nav-pages">
                      {sectionPages.map((page) => pageLink(page, closeAfter))}
                    </div>
                  </details>
                );
              })}
              {orphans.length > 0 ? (
                <details
                  className="nav-section"
                  open={orphans.some((page) => page.id === currentPageId)}
                >
                  <summary>More</summary>
                  <div className="nav-pages">
                    {orphans.map((page) => pageLink(page, closeAfter))}
                  </div>
                </details>
              ) : null}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-view" role="group" aria-label="Reading mode">
            <span>View</span>
            <div className="segmented-control">
              <button
                type="button"
                aria-pressed={mode === "paged"}
                onClick={() => onModeChange("paged")}
              >
                Page
              </button>
              <button
                type="button"
                aria-pressed={mode === "continuous"}
                onClick={() => onModeChange("continuous")}
              >
                Continuous
              </button>
            </div>
          </div>

          <div className="sidebar-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (closeAfter) mobileDialogRef.current?.close();
                onAddAgent();
              }}
            >
              Add Agent
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (closeAfter) mobileDialogRef.current?.close();
                onShare();
              }}
            >
              Share
            </button>
          </div>

          <details className="wiki-about">
            <summary>About this wiki</summary>
            <dl>
              <div>
                <dt>Pages</dt>
                <dd>{pages.length}</dd>
              </div>
              {wiki.runtimeModelLabel || wiki.runtime ? (
                <div>
                  <dt>Generated with</dt>
                  <dd>{wiki.runtimeModelLabel || wiki.runtime}</dd>
                </div>
              ) : null}
              {wiki.wikiStyle ? (
                <div>
                  <dt>Style</dt>
                  <dd>{wiki.wikiStyle}</dd>
                </div>
              ) : null}
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(wiki.updatedAt || wiki.generatedAt)}</dd>
              </div>
            </dl>
          </details>
        </div>
      </>
    );
  }

  return (
    <>
      <aside className="sidebar">{sidebarContent()}</aside>
      <dialog
        ref={mobileDialogRef}
        className="mobile-contents-dialog"
        aria-label="Wiki contents"
        onClose={() => {
          onMobileClose();
          mobileReturnFocusRef.current?.focus();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) mobileDialogRef.current?.close();
        }}
      >
        {sidebarContent(true, true)}
      </dialog>
    </>
  );
}
