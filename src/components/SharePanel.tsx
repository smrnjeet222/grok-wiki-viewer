import { useEffect, useRef, useState } from "react";
import { wikiApiBase } from "../lib/api";
import type { WikiRecord } from "../lib/types";
import {
  buildFullMarkdown,
  buildLlmsTxt,
  buildObsidianZip,
  openInBrowser,
  triggerDownload,
} from "../lib/wikiExport";

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return {
    ref,
    restoreFocus: () => returnFocusRef.current?.focus(),
  };
}

export function SharePanel({
  wiki,
  open,
  onClose,
}: {
  wiki: WikiRecord;
  open: boolean;
  onClose: () => void;
}) {
  const { ref: dialogRef, restoreFocus } = useModal(open);
  const [copyStatus, setCopyStatus] = useState("");
  const base = wikiApiBase(wiki.id);
  const localUrl = `${window.location.origin}/wiki/${encodeURIComponent(wiki.id)}`;

  return (
    <dialog
      ref={dialogRef}
      className="dialog share-dialog"
      aria-labelledby="share-dialog-title"
      onClose={() => {
        onClose();
        restoreFocus();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Export</p>
          <h2 id="share-dialog-title">Share this wiki</h2>
        </div>
        <button
          type="button"
          className="icon-btn close-btn"
          aria-label="Close share dialog"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <p className="dialog-intro">
        Copy a local link or export the complete wiki for another reader or tool.
      </p>

      <div className="export-list">
        <button
          type="button"
          className="export-action"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(localUrl);
              setCopyStatus("Local link copied.");
            } catch {
              setCopyStatus("Couldn’t copy the local link.");
            }
          }}
        >
          <span>
            <strong>Local link</strong>
            <small>Open this wiki on this machine</small>
          </span>
          <span aria-hidden="true">Copy</span>
        </button>
        <button
          type="button"
          className="export-action"
          onClick={() => {
            openInBrowser(buildFullMarkdown(wiki, base));
            setCopyStatus("Full Markdown opened in a new tab.");
          }}
        >
          <span>
            <strong>Full Markdown</strong>
            <small>One portable Markdown document</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          className="export-action"
          onClick={() => {
            openInBrowser(buildLlmsTxt(wiki, base));
            setCopyStatus("llms.txt opened in a new tab.");
          }}
        >
          <span>
            <strong>llms.txt</strong>
            <small>Compact agent-readable index</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          className="export-action"
          onClick={() => {
            openInBrowser(buildFullMarkdown(wiki, base));
            setCopyStatus("llms-full.txt opened in a new tab.");
          }}
        >
          <span>
            <strong>llms-full.txt</strong>
            <small>Complete agent-readable content</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          className="export-action"
          onClick={() => {
            triggerDownload(
              `${wiki.id}-obsidian.zip`,
              buildObsidianZip(wiki),
              "application/zip",
            );
            setCopyStatus("Obsidian vault downloaded.");
          }}
        >
          <span>
            <strong>Obsidian vault</strong>
            <small>Download linked notes as ZIP</small>
          </span>
          <span aria-hidden="true">↓</span>
        </button>
        <button
          type="button"
          className="export-action"
          onClick={() => {
            dialogRef.current?.close();
            window.requestAnimationFrame(() => window.print());
          }}
        >
          <span>
            <strong>Print / save PDF</strong>
            <small>Current page, or all pages in continuous view</small>
          </span>
          <span aria-hidden="true">⌘P</span>
        </button>
      </div>
      <p className="copy-status" role="status" aria-live="polite">
        {copyStatus}
      </p>
    </dialog>
  );
}

export function AgentHandoff({
  prompt,
  open,
  onClose,
}: {
  prompt: string;
  open: boolean;
  onClose: () => void;
}) {
  const { ref: dialogRef, restoreFocus } = useModal(open);
  const [copyStatus, setCopyStatus] = useState("");

  return (
    <dialog
      ref={dialogRef}
      className="dialog agent-dialog"
      aria-labelledby="agent-dialog-title"
      onClose={() => {
        onClose();
        restoreFocus();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Handoff</p>
          <h2 id="agent-dialog-title">Add Agent</h2>
        </div>
        <button
          type="button"
          className="icon-btn close-btn"
          aria-label="Close Add Agent dialog"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="dialog-intro">
        Copy a provider-neutral handoff prompt for your local agent.
      </p>
      <label className="sr-only" htmlFor="agent-handoff-prompt">
        Agent handoff prompt
      </label>
      <textarea
        id="agent-handoff-prompt"
        readOnly
        value={prompt}
        rows={12}
        className="agent-prompt"
      />
      <div className="dialog-footer">
        <p className="copy-status" role="status" aria-live="polite">
          {copyStatus}
        </p>
        <button
          type="button"
          className="btn primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setCopyStatus("Prompt copied.");
            } catch {
              setCopyStatus("Couldn’t copy the prompt.");
            }
          }}
        >
          Copy prompt
        </button>
      </div>
    </dialog>
  );
}
