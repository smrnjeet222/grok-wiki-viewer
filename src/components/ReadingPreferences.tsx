import { useEffect, useRef, useState } from "react";
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  readPreferences,
  savePreferences,
  type ReaderPreferences,
} from "../lib/preferences";

const choices = {
  theme: [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ],
  prose: [
    ["sans", "Sans"],
    ["serif", "Serif"],
  ],
  textSize: [
    ["small", "Small"],
    ["default", "Default"],
    ["large", "Large"],
  ],
  spacing: [
    ["compact", "Compact"],
    ["comfortable", "Relaxed"],
  ],
  measure: [
    ["narrow", "Narrow"],
    ["default", "Standard"],
    ["wide", "Wide"],
  ],
} as const;

export function ReadingPreferences() {
  const [preferences, setPreferences] = useState<ReaderPreferences>(readPreferences);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    applyPreferences(preferences);
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (preferences.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyPreferences(preferences);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preferences]);

  function update<K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function renderChoices<K extends keyof typeof choices>(key: K) {
    return choices[key].map(([value, label]) => (
      <label className="preference-option" key={value}>
        <input
          type="radio"
          name={key}
          value={value}
          checked={preferences[key] === value}
          onChange={() => update(key, value as ReaderPreferences[K])}
        />
        <span>{label}</span>
      </label>
    ));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn reading-trigger"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="reading-glyph" aria-hidden="true">
          Aa
        </span>
        <span>Reading</span>
      </button>

      <dialog
        ref={dialogRef}
        className="dialog preferences-dialog"
        aria-labelledby="reading-preferences-title"
        onClose={() => triggerRef.current?.focus()}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Display</p>
            <h2 id="reading-preferences-title">Reading preferences</h2>
          </div>
          <button
            type="button"
            className="icon-btn close-btn"
            aria-label="Close reading preferences"
            onClick={() => dialogRef.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="preference-groups">
          <fieldset>
            <legend>Theme</legend>
            <div className="preference-options">{renderChoices("theme")}</div>
          </fieldset>
          <fieldset>
            <legend>Prose typeface</legend>
            <div className="preference-options">{renderChoices("prose")}</div>
          </fieldset>
          <fieldset>
            <legend>Text size</legend>
            <div className="preference-options">{renderChoices("textSize")}</div>
          </fieldset>
          <fieldset>
            <legend>Line spacing</legend>
            <div className="preference-options">{renderChoices("spacing")}</div>
          </fieldset>
          <fieldset>
            <legend>Reading width</legend>
            <div className="preference-options">{renderChoices("measure")}</div>
          </fieldset>
        </div>

        <div className="dialog-footer">
          <button
            type="button"
            className="text-btn"
            onClick={() => setPreferences({ ...DEFAULT_PREFERENCES })}
          >
            Reset defaults
          </button>
          <button type="button" className="btn primary" onClick={() => dialogRef.current?.close()}>
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
