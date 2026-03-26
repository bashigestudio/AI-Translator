import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../lib/settings";

export type TranslateStartArgs = Pick<
  AppSettings,
  "baseUrl" | "apiKey" | "model" | "targetLanguage" | "mode"
> & { text: string };

export async function startTranslateStream(args: TranslateStartArgs): Promise<string> {
  return invoke<string>("start_translate_stream", {
    args: {
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      targetLanguage: args.targetLanguage,
      text: args.text,
      mode: args.mode,
    },
  });
}

export async function cancelTranslate(requestId: string): Promise<void> {
  await invoke<void>("cancel_translate", { requestId });
}
