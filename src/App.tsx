import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cancelTranslate, startTranslateStream } from "./api/translate";
import {
  loadSettings,
  saveSettings,
  TARGET_LANGUAGES,
  type AppSettings,
} from "./lib/settings";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    elapsedMs: number;
    inputChars: number;
    outputChars: number;
  } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const outputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeRequestId = useRef<string | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    let cancelled = false;

    const setup = async () => {
      const u1 = await listen<{
        requestId: string;
        delta: string;
        outputLen: number;
        elapsedMs: number;
      }>("translate_chunk", (e) => {
        const p = e.payload;
        if (!p || p.requestId !== activeRequestId.current) return;
        setOutput((prev) => prev + p.delta);
        setStats((prev) => ({
          elapsedMs: p.elapsedMs,
          inputChars: prev?.inputChars ?? input.length,
          outputChars: p.outputLen,
        }));
      });
      const u2 = await listen<{
        requestId: string;
        output: string;
        elapsedMs: number;
        inputChars: number;
        outputChars: number;
      }>("translate_done", (e) => {
        const p = e.payload;
        if (!p || p.requestId !== activeRequestId.current) return;
        setOutput(p.output);
        setStats({
          elapsedMs: p.elapsedMs,
          inputChars: p.inputChars,
          outputChars: p.outputChars,
        });
        setLoading(false);
        activeRequestId.current = null;
      });
      const u3 = await listen<{
        requestId: string;
        message: string;
        httpStatus?: number | null;
        raw?: string | null;
        elapsedMs: number;
      }>("translate_error", (e) => {
        const p = e.payload;
        if (!p || p.requestId !== activeRequestId.current) return;
        setError(p.message || "Request failed");
        setLoading(false);
        activeRequestId.current = null;
        setStats((prev) => ({
          elapsedMs: p.elapsedMs,
          inputChars: prev?.inputChars ?? input.length,
          outputChars: prev?.outputChars ?? 0,
        }));
      });

      unsubs.push(() => u1(), () => u2(), () => u3());
    };

    void setup().catch(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
      for (const u of unsubs) u();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const runTranslate = useCallback(async () => {
    setError(null);
    setStats(null);
    setLoading(true);
    setOutput("");
    try {
      const requestId = await startTranslateStream({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        targetLanguage: settings.targetLanguage,
        mode: settings.mode,
        text: input,
      });
      activeRequestId.current = requestId;
      setStats({
        elapsedMs: 0,
        inputChars: input.length,
        outputChars: 0,
      });
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
            ? e.message
            : String(e);
      setError(msg);
      setLoading(false);
    }
  }, [settings, input]);

  const onCancel = useCallback(async () => {
    const id = activeRequestId.current;
    if (!id) return;
    try {
      await cancelTranslate(id);
    } finally {
      activeRequestId.current = null;
      setLoading(false);
      setStats(null);
      setError(null);
      setOutput((prev) => (prev ? prev : "Canceled"));
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        void runTranslate();
        return;
      }
      if (e.key === "Escape") {
        if (loading) {
          e.preventDefault();
          void onCancel();
        }
        return;
      }
      if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "c" || e.key === "C")) {
        if (output) {
          e.preventDefault();
          void onCopy();
        }
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        void onPaste();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runTranslate, loading, onCancel, output]);

  const onCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyHint("Copied");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint("Copy failed");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyHint(null), 2000);
    }
  };

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      inputRef.current?.focus();
      setPasteHint("Pasted");
    } catch {
      setPasteHint("Paste failed");
    } finally {
      if (pasteTimer.current) clearTimeout(pasteTimer.current);
      pasteTimer.current = setTimeout(() => setPasteHint(null), 2000);
    }
  };

  const onClear = () => {
    setInput("");
    setOutput("");
    setError(null);
  };

  const AD_URL = "https://rushtranslate.com/?ref=tianic";
  const AD_TEXT =
    "Best ATA Certified Translation, Notarized Translation, and USCIS Translation Services.";

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-row">
          <label className="field">
            <span className="label">API Base</span>
            <input
              type="url"
              value={settings.baseUrl}
              onChange={(e) => patchSettings({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span className="label">API Key</span>
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => patchSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label
            className="checkbox"
            title="By default, the API key is not saved on this device"
          >
            <input
              type="checkbox"
              checked={settings.rememberApiKey}
              onChange={(e) =>
                patchSettings({
                  rememberApiKey: e.currentTarget.checked,
                  apiKey: e.currentTarget.checked ? settings.apiKey : "",
                })
              }
            />
            <span>Remember</span>
          </label>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setShowKey((v) => !v)}
            title="Show/hide API key"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <div className="toolbar-row">
          <label className="field narrow">
            <span className="label">Model</span>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => patchSettings({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              spellCheck={false}
            />
          </label>
          <label className="field narrow">
            <span className="label">Mode</span>
            <select
              value={settings.mode}
              onChange={(e) =>
                patchSettings({
                  mode: e.target.value as AppSettings["mode"],
                })
              }
            >
              <option value="faithful">Faithful</option>
              <option value="balanced">Balanced</option>
              <option value="idiomatic">Idiomatic</option>
            </select>
          </label>
          <label className="field narrow">
            <span className="label">Target</span>
            <select
              value={settings.targetLanguage}
              onChange={(e) =>
                patchSettings({ targetLanguage: e.target.value })
              }
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn primary toolbar-cta"
            disabled={loading}
            onClick={() => void runTranslate()}
          >
            {loading ? "Translating…" : "Translate"}
          </button>
          <button
            type="button"
            className="btn ghost toolbar-cta"
            disabled={!loading}
            onClick={() => void onCancel()}
            title="Cancel (Esc)"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn ghost toolbar-cta"
            onClick={onClear}
            disabled={loading}
          >
            Clear
          </button>
        </div>
        <p className="hint">
          Enter LLM Base URL, API Key, and Model ID, then click “Translate”.
          {stats
            ? ` Stats: ${stats.elapsedMs}ms · In ${stats.inputChars} chars · Out ${stats.outputChars} chars`
            : null}
        </p>
      </header>

      <main className="panes">
        <section className="pane input-pane">
          <div className="pane-head">
            <span>Input</span>
            <div className="pane-actions">
              <button
                type="button"
                className="btn small"
                onClick={() => void onPaste()}
                disabled={loading}
              >
                Paste
              </button>
              {pasteHint ? <span className="toast">{pasteHint}</span> : null}
            </div>
          </div>
          <textarea
            className="pane-body"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text to translate…"
            disabled={loading}
            ref={inputRef}
          />
        </section>
        <section className="pane output-pane">
          <div className="pane-head">
            <span>Output</span>
            <button
              type="button"
              className="btn small"
              onClick={() => void onCopy()}
              disabled={!output}
            >
              Copy
            </button>
            {copyHint ? <span className="toast">{copyHint}</span> : null}
          </div>
          <textarea
            className={`pane-body${error ? " error-text" : ""}`}
            readOnly
            value={error ? `Error: ${error}` : output}
            placeholder={loading ? "Requesting model…" : "Output will appear here"}
            ref={outputRef}
          />
        </section>
      </main>

      <footer className="adbar" role="contentinfo">
        <div className="adbar-left">
          <span className="ad-badge">AD</span>
          <span
            className="ad-text ad-link"
            role="link"
            tabIndex={0}
            onClick={() => void openUrl(AD_URL)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void openUrl(AD_URL);
              }
            }}
          >
            <strong>{AD_TEXT}</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
