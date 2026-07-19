import { Link, Route, Routes } from "react-router-dom";
import { ReadingPreferences } from "./components/ReadingPreferences";
import { LibraryPage } from "./pages/LibraryPage";
import { WikiPage } from "./pages/WikiPage";

export function App() {
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
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/wiki/:id" element={<WikiPage />} />
      </Routes>
    </div>
  );
}
