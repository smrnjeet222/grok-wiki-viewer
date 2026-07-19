import type { ReactNode } from "react";
import { createElement, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { handleHashLinkClick } from "../lib/scroll";
import { normalizeHeadingText } from "../lib/headings";
import { MermaidBlock } from "./MermaidBlock";

export { extractHeadings, normalizeHeadingText } from "../lib/headings";

export interface NormalizedWikiPage {
  body: string;
  sourceDetails: string | null;
}

/** Move generated source boilerplate out of the reading flow and remove its duplicate title. */
export function normalizeWikiPageContent(content: string, pageTitle: string): NormalizedWikiPage {
  let body = content.trim();
  let sourceDetails: string | null = null;
  const details = body.match(/^\s*(<details>[\s\S]*?<\/details>)\s*/i);

  if (details && /source files/i.test(details[1])) {
    sourceDetails = details[1];
    body = body.slice(details[0].length).trimStart();
  }

  const heading = body.match(/^#\s+([^\n]+)\n?/);
  if (
    heading &&
    normalizeHeadingText(heading[1]).toLocaleLowerCase() ===
      normalizeHeadingText(pageTitle).toLocaleLowerCase()
  ) {
    body = body.slice(heading[0].length).trimStart();
  }

  return { body, sourceDetails };
}

function mdLinkToHtml(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safeHref = String(href).replace(/"/g, "&quot;");
    const safeLabel = String(label)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<a href="${safeHref}"><code>${safeLabel}</code></a>`;
  });
}

/** Markdown inside HTML blocks is not re-parsed — convert details bodies to HTML. */
export function preprocessWikiMarkdown(content: string): string {
  return content.replace(/<details>([\s\S]*?)<\/details>/gi, (_full, inner: string) => {
    const summaryMatch = inner.match(/<summary>([\s\S]*?)<\/summary>/i);
    const summary = summaryMatch ? summaryMatch[1].trim() : "Relevant source files";
    let body = summaryMatch
      ? inner.slice((summaryMatch.index ?? 0) + summaryMatch[0].length)
      : inner;
    body = body.replace(/^\s+/, "");

    const lines = body.split("\n");
    const before: string[] = [];
    const items: string[] = [];
    for (const line of lines) {
      const item = /^\s*-\s+(.+)$/.exec(line);
      if (item) items.push(item[1].trim());
      else if (line.trim()) before.push(line.trim().replace(/^>\s?/, ""));
    }

    const intro = before.length ? `<p>${mdLinkToHtml(before.join(" "))}</p>` : "";
    const list =
      items.length > 0
        ? `<ul class="source-file-list">${items
            .map((item) => `<li>${mdLinkToHtml(item)}</li>`)
            .join("")}</ul>`
        : mdLinkToHtml(body);

    return `<details class="source-files"><summary>${summary}</summary>${intro}${list}</details>`;
  });
}

function extractMermaidFromPre(children: ReactNode): string | null {
  const child = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(child)) return null;
  const className = String((child.props as { className?: string }).className || "");
  if (!className.includes("language-mermaid")) return null;
  return String((child.props as { children?: ReactNode }).children ?? "").replace(/\n$/, "");
}

type HeadingProps = {
  id?: string;
  children?: ReactNode;
};

function shiftedHeading(
  level: number,
  offset: number,
  idPrefix: string,
  id: string | undefined,
  children: ReactNode,
) {
  return createElement(
    `h${Math.min(6, level + offset)}`,
    { id: id ? `${idPrefix}${id}` : undefined },
    children,
  );
}

export function WikiMarkdown({
  content,
  headingOffset = 1,
  idPrefix = "",
}: {
  content: string;
  headingOffset?: number;
  idPrefix?: string;
}) {
  const prepared = preprocessWikiMarkdown(content);

  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
        components={{
          h1({ id, children }: HeadingProps) {
            return shiftedHeading(1, headingOffset, idPrefix, id, children);
          },
          h2({ id, children }: HeadingProps) {
            return shiftedHeading(2, headingOffset, idPrefix, id, children);
          },
          h3({ id, children }: HeadingProps) {
            return shiftedHeading(3, headingOffset, idPrefix, id, children);
          },
          h4({ id, children }: HeadingProps) {
            return shiftedHeading(4, headingOffset, idPrefix, id, children);
          },
          a({ href, children, ...props }) {
            if (href?.startsWith("#")) {
              const scopedHref = `#${idPrefix}${href.slice(1)}`;
              return (
                <a href={scopedHref} onClick={handleHashLinkClick} {...props}>
                  {children}
                </a>
              );
            }
            return (
              <a href={href} {...props}>
                {children}
              </a>
            );
          },
          pre({ children }) {
            const chart = extractMermaidFromPre(children);
            if (chart != null) return <MermaidBlock chart={chart} />;

            const child = Array.isArray(children) ? children[0] : children;
            const className = isValidElement(child)
              ? String((child.props as { className?: string }).className || "")
              : "";
            const lang =
              /language-([\w-]+)/.exec(className)?.[1] ||
              (/hljs/.test(className) ? "code" : "");

            return (
              <div className="code-block">
                {lang && lang !== "mermaid" ? (
                  <div className="code-block-meta">
                    <span>{lang}</span>
                  </div>
                ) : null}
                <pre className="hljs-pre" tabIndex={0}>
                  {children}
                </pre>
              </div>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");
            const isBlock = Boolean(className);
            if (!isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            if (match?.[1] === "mermaid") {
              return <MermaidBlock chart={code} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="table-scroll" tabIndex={0}>
                <table>{children}</table>
              </div>
            );
          },
          img({ alt = "", ...props }) {
            return <img alt={alt} loading="lazy" {...props} />;
          },
        }}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
