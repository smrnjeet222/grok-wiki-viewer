import { useEffect, useMemo, useRef, useState } from "react";

let renderSeq = 0;
let dialogSeq = 0;
let lastThemeKey = "";
type MermaidApi = typeof import("mermaid").default;
let mermaidPromise: Promise<MermaidApi> | null = null;

type ThemeMode = "light" | "dark";

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ||= import("mermaid").then((module) => module.default);
  return mermaidPromise;
}

function currentTheme(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function themeVariables(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      darkMode: true,
      background: "#171a1d",
      primaryColor: "#1d2125",
      primaryTextColor: "#edf0f2",
      primaryBorderColor: "#a6adb4",
      secondaryColor: "#20252a",
      secondaryTextColor: "#edf0f2",
      secondaryBorderColor: "#77818c",
      tertiaryColor: "#171a1d",
      tertiaryTextColor: "#edf0f2",
      tertiaryBorderColor: "#626b75",
      lineColor: "#a6adb4",
      textColor: "#edf0f2",
      mainBkg: "#1d2125",
      nodeBorder: "#a6adb4",
      clusterBkg: "#20252a",
      clusterBorder: "#77818c",
      titleColor: "#edf0f2",
      edgeLabelBackground: "#171a1d",
      actorBkg: "#1d2125",
      actorBorder: "#a6adb4",
      actorTextColor: "#edf0f2",
      actorLineColor: "#77818c",
      signalColor: "#edf0f2",
      signalTextColor: "#edf0f2",
      labelBoxBkgColor: "#1d2125",
      labelBoxBorderColor: "#a6adb4",
      labelTextColor: "#edf0f2",
      loopTextColor: "#edf0f2",
      noteBkgColor: "#332218",
      noteTextColor: "#edf0f2",
      noteBorderColor: "#ffad72",
      activationBkgColor: "#332218",
      activationBorderColor: "#ffad72",
      sequenceNumberColor: "#171a1d",
      pie1: "#ffad72",
      pie2: "#a6adb4",
      pie3: "#626b75",
      pieTitleTextColor: "#edf0f2",
      pieSectionTextColor: "#edf0f2",
      pieLegendTextColor: "#edf0f2",
    };
  }

  return {
    darkMode: false,
    background: "#fafaf8",
    primaryColor: "#f5f5f1",
    primaryTextColor: "#1a1d21",
    primaryBorderColor: "#626971",
    secondaryColor: "#eeefea",
    secondaryTextColor: "#1a1d21",
    secondaryBorderColor: "#626971",
    tertiaryColor: "#fafaf8",
    tertiaryTextColor: "#1a1d21",
    tertiaryBorderColor: "#626971",
    lineColor: "#626971",
    textColor: "#1a1d21",
    mainBkg: "#f5f5f1",
    nodeBorder: "#626971",
    clusterBkg: "#eeefea",
    clusterBorder: "#626971",
    titleColor: "#1a1d21",
    edgeLabelBackground: "#fafaf8",
    actorBkg: "#f5f5f1",
    actorBorder: "#626971",
    actorTextColor: "#1a1d21",
    actorLineColor: "#626971",
    signalColor: "#1a1d21",
    signalTextColor: "#1a1d21",
    labelBoxBkgColor: "#f5f5f1",
    labelBoxBorderColor: "#626971",
    labelTextColor: "#1a1d21",
    loopTextColor: "#1a1d21",
    noteBkgColor: "#f8e9df",
    noteTextColor: "#1a1d21",
    noteBorderColor: "#a8440c",
    activationBkgColor: "#eeefea",
    activationBorderColor: "#a8440c",
    sequenceNumberColor: "#fafaf8",
    pie1: "#a8440c",
    pie2: "#626971",
    pie3: "#8a9097",
    pieTitleTextColor: "#1a1d21",
    pieSectionTextColor: "#1a1d21",
    pieLegendTextColor: "#1a1d21",
  };
}

function ensureMermaid(mermaid: MermaidApi, mode: ThemeMode) {
  const key = mode;
  if (key === lastThemeKey) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    suppressErrorRendering: true,
    theme: "base",
    themeVariables: themeVariables(mode),
    flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
    sequence: { actorMargin: 24, messageMargin: 32 },
  });
  lastThemeKey = key;
}

function cleanupMermaidArtifacts(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
  document.getElementById(`d${id}`)?.remove();
  document.querySelectorAll('[id^="dmermaid-"]').forEach((el) => {
    if (!el.textContent?.trim() && el.childElementCount === 0) el.remove();
  });
  document
    .querySelectorAll("body > svg[aria-roledescription='error'], body > svg.error-icon")
    .forEach((el) => el.remove());
}

/** Make mermaid SVG fluid: keep viewBox, drop fixed px size. */
function makeSvgResponsive(svg: string): string {
  return svg
    .replace(/<svg([^>]*)>/i, (_full, attrs: string) => {
      let next = attrs
        .replace(/\swidth="[^"]*"/i, "")
        .replace(/\sheight="[^"]*"/i, "")
        .replace(/\sstyle="[^"]*"/i, "");
      if (!/viewBox=/i.test(next)) {
        const w = attrs.match(/\swidth="([\d.]+)"/i)?.[1];
        const h = attrs.match(/\sheight="([\d.]+)"/i)?.[1];
        if (w && h) next += ` viewBox="0 0 ${w} ${h}"`;
      }
      next += ` width="100%" height="auto" preserveAspectRatio="xMidYMid meet"`;
      return `<svg${next}>`;
    })
    .replace(/style="max-width:\s*[\d.]+px;?"/gi, 'style="max-width:100%;height:auto"');
}

/**
 * Generators sometimes emit unquoted flowchart edge labels containing `()`, `[]`,
 * or `{}` (e.g. `A -->|Execute()| B`), which crash the mermaid parser. Wrap such
 * labels in quotes defensively. Only touches flowchart/graph diagrams.
 */
function quoteEdgeLabels(chart: string): string {
  const first = chart.trimStart().split(/\s+/)[0];
  if (first !== "flowchart" && first !== "graph") return chart;
  return chart.replace(/\|([^|\n]+)\|/g, (match, label: string) => {
    const trimmed = label.trim();
    if (/^".*"$/.test(trimmed)) return match; // already quoted
    if (!/[()[\]{}]/.test(trimmed)) return match; // no risky chars
    return `|"${trimmed.replace(/"/g, "'")}"|`;
  });
}

/** Inline SVG ids are document-global; scope the dialog copy away from the preview. */
function scopeSvgIds(svg: string, prefix: string): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  return ids.reduce((result, id) => result.split(id).join(`${prefix}${id}`), svg);
}

function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() =>
    typeof document !== "undefined" ? currentTheme() : "light",
  );

  useEffect(() => {
    const sync = () => setMode(currentTheme());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return mode;
}

export function MermaidBlock({ chart }: { chart: string }) {
  const theme = useThemeMode();
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [svg, setSvg] = useState("");
  const [dialogTitleId] = useState(() => `diagram-viewer-${++dialogSeq}`);
  const [scale, setScale] = useState(1);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
    left: number;
    top: number;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dialogSvg = useMemo(
    () => scopeSvgIds(svg, `${dialogTitleId}-`),
    [dialogTitleId, svg],
  );

  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${++renderSeq}-${Math.random().toString(36).slice(2, 9)}`;

    (async () => {
      await document.fonts?.ready;
      if (cancelled) return;
      const mermaid = await loadMermaid();
      if (cancelled) return;
      ensureMermaid(mermaid, theme);
      try {
        const { svg: rendered } = await mermaid.render(id, quoteEdgeLabels(chart.trim()));
        cleanupMermaidArtifacts(id);
        if (cancelled) return;
        setSvg(makeSvgResponsive(rendered));
        setError(null);
      } catch (err) {
        cleanupMermaidArtifacts(id);
        if (!cancelled) {
          setSvg("");
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupMermaidArtifacts(id);
    };
  }, [chart, theme]);

  useEffect(() => {
    if (!zoomed) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [zoomed]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (zoomed && !dialog.open) {
      dialog.style.cssText = "";
      dialog.showModal();
    }
    if (!zoomed && dialog.open) dialog.close();
  }, [zoomed]);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(4, Number((s + 0.15).toFixed(2))));
      if (e.key === "-" || e.key === "_") setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
      if (e.key === "0") {
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  if (error) {
    return (
      <details className="mermaid-error">
        <summary>Diagram failed to render</summary>
        <pre>{error}</pre>
        <pre>{chart}</pre>
      </details>
    );
  }

  if (!svg) {
    return <div className="mermaid-wrap mermaid-loading">Rendering diagram…</div>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`mermaid-wrap mermaid-theme-${theme}`}
        role="button"
        tabIndex={0}
        aria-label="Open diagram viewer"
        aria-haspopup="dialog"
        onClick={() => setZoomed(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setZoomed(true);
          }
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <dialog
        ref={dialogRef}
        className="zoom-dialog"
        aria-labelledby={dialogTitleId}
        onClose={() => {
          setZoomed(false);
          triggerRef.current?.focus();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className={`zoom-panel mermaid-theme-${theme}`}>
          <div className="zoom-toolbar">
            <strong id={dialogTitleId}>Diagram viewer</strong>
            <button
              type="button"
              className="btn"
              aria-label="Zoom out"
              onClick={() =>
                setScale((current) => Math.max(0.4, Number((current - 0.2).toFixed(2))))
              }
            >
              −
            </button>
            <input
              type="range"
              min={0.4}
              max={4}
              step={0.05}
              value={scale}
              aria-label="Diagram zoom"
              onChange={(event) => setScale(Number(event.target.value))}
            />
            <button
              type="button"
              className="btn"
              aria-label="Zoom in"
              onClick={() =>
                setScale((current) => Math.min(4, Number((current + 0.2).toFixed(2))))
              }
            >
              +
            </button>
            <span className="zoom-label">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Reset
            </button>
            <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </div>
          <div
            className="zoom-canvas"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                x: event.clientX,
                y: event.clientY,
                ox: pan.x,
                oy: pan.y,
              };
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              const dx = event.clientX - dragRef.current.x;
              const dy = event.clientY - dragRef.current.y;
              setPan({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.02 : 0.02;
              setScale((current) =>
                Math.min(4, Math.max(0.4, Number((current + delta).toFixed(3)))),
              );
            }}
          >
            <div
              className="zoom-stage"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              }}
              dangerouslySetInnerHTML={{ __html: dialogSvg }}
            />
          </div>
          <button
            type="button"
            className="zoom-resize"
            aria-label="Resize diagram viewer"
            onPointerDown={(event) => {
              const dialog = dialogRef.current;
              if (!dialog) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              const rect = dialog.getBoundingClientRect();
              resizeRef.current = {
                x: event.clientX,
                y: event.clientY,
                w: rect.width,
                h: rect.height,
                left: rect.left,
                top: rect.top,
              };
            }}
            onPointerMove={(event) => {
              const start = resizeRef.current;
              const dialog = dialogRef.current;
              if (!start || !dialog) return;
              const maxW = window.innerWidth - 16;
              const maxH = window.innerHeight - 16;
              const width = Math.max(
                352,
                Math.min(maxW, start.w + (event.clientX - start.x) * 2),
              );
              const height = Math.max(
                256,
                Math.min(maxH, start.h + (event.clientY - start.y) * 2),
              );
              dialog.style.width = `${width}px`;
              dialog.style.height = `${height}px`;
            }}
            onPointerUp={(event) => {
              resizeRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              resizeRef.current = null;
            }}
          />
        </div>
      </dialog>
    </>
  );
}
