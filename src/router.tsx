import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { ReadingPreferences } from "./components/ReadingPreferences";
import { LibraryPage } from "./pages/LibraryPage";
import { WikiPage } from "./pages/WikiPage";
import { queryClient } from "./lib/queryClient";
import { wikiDetailQuery, wikiListQuery } from "./lib/queries";

export interface WikiSearch {
  page?: string;
  mode?: "paged" | "continuous";
}

function RootLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="Grok-Wiki local reader home">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <span className="brand-title">Grok-Wiki</span>
            <span className="brand-kicker">Local reader</span>
          </span>
        </Link>
        <div className="topbar-actions">
          <ReadingPreferences />
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: () => queryClient.ensureQueryData(wikiListQuery),
  component: LibraryPage,
});

const wikiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/wiki/$id",
  validateSearch: (search: Record<string, unknown>): WikiSearch => ({
    page: typeof search.page === "string" ? search.page : undefined,
    mode: search.mode === "continuous" ? "continuous" : undefined,
  }),
  loader: ({ params }) => queryClient.ensureQueryData(wikiDetailQuery(params.id)),
  component: WikiPage,
});

const routeTree = rootRoute.addChildren([indexRoute, wikiRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

export { indexRoute, wikiRoute };

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
