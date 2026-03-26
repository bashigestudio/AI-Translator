const STORAGE_KEY = "translator-app-settings-v1";

export type AppSettings = {
  baseUrl: string;
  apiKey: string;
  rememberApiKey: boolean;
  model: string;
  targetLanguage: string;
  mode: "faithful" | "balanced" | "idiomatic";
};

const defaultSettings: AppSettings = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  rememberApiKey: false,
  model: "gpt-4o-mini",
  targetLanguage: "English",
  mode: "balanced",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const merged = { ...defaultSettings, ...parsed };
    // Migrate legacy language labels into current English labels
    const map: Record<string, string> = {
      // Chinese UI legacy
      "简体中文": "Chinese (Simplified)",
      "简体中文 (中国大陆)": "Chinese (Simplified)",
      "繁體中文": "Chinese (Traditional, Taiwan)",
      "繁體中文 (台灣)": "Chinese (Traditional, Taiwan)",
      "繁體中文（台灣）": "Chinese (Traditional, Taiwan)",
      "德语": "German",
      "Deutsch": "German",
      "韩语": "Korean",
      "한국어": "Korean",
      "越南语": "Vietnamese",
      "Tiếng Việt": "Vietnamese",
      "印尼语": "Indonesian",
      "Bahasa Indonesia": "Indonesian",
      // Keep common English labels
      "English": "English",
      "日本語": "Japanese",
      "Japanese": "Japanese",
      "Français": "French",
      "French": "French",
      "Español": "Spanish",
      "Spanish": "Spanish",
      "Русский": "Russian",
      "Russian": "Russian",
      "العربية": "Arabic",
      "Arabic": "Arabic",
    };
    const t = (merged.targetLanguage || "").trim();
    if (t in map) merged.targetLanguage = map[t]!;
    if (
      merged.mode !== "faithful" &&
      merged.mode !== "balanced" &&
      merged.mode !== "idiomatic"
    ) {
      merged.mode = "balanced";
    }
    if (typeof merged.rememberApiKey !== "boolean") {
      merged.rememberApiKey = false;
    }
    if (!merged.rememberApiKey) {
      merged.apiKey = "";
    }
    return merged;
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: AppSettings): void {
  const payload: AppSettings = {
    ...s,
    apiKey: s.rememberApiKey ? s.apiKey : "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export const TARGET_LANGUAGES = [
  "English",
  "Chinese (Simplified)",
  "Chinese (Traditional, Taiwan)",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Indonesian",
  "French",
  "German",
  "Spanish",
  "Russian",
  "Arabic",
] as const;
