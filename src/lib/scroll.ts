function motionSafeBehavior(behavior: ScrollBehavior): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior;
}

/** Scroll to an in-page target using normal document flow. */
export function scrollToHash(hash: string, behavior: ScrollBehavior = "smooth"): boolean {
  const id = decodeURIComponent(String(hash || "").replace(/^#/, "")).trim();
  if (!id) return false;

  const el =
    document.getElementById(id) ||
    document.querySelector(`#${CSS.escape(id)}`) ||
    document.querySelector(`[id="${CSS.escape(id)}"]`);

  if (!(el instanceof HTMLElement)) return false;
  el.scrollIntoView({ block: "start", behavior: motionSafeBehavior(behavior) });
  return true;
}

export function handleHashLinkClick(
  event: { preventDefault(): void; currentTarget: EventTarget & { getAttribute(name: string): string | null } },
): void {
  const href = event.currentTarget.getAttribute("href");
  if (!href || !href.startsWith("#") || href === "#") return;
  event.preventDefault();
  if (scrollToHash(href) && window.location.hash !== href) {
    window.history.pushState(null, "", href);
  }
}
