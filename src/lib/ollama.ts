export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CUSTOM_OLLAMA_URL_KEY = "alexa-ollama-url";
const DEFAULT_DIRECT_OLLAMA_URL = "http://127.0.0.1:11434";

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, "");
}

function getOllamaBase(): string {
  const saved = typeof window !== "undefined" ? localStorage.getItem(CUSTOM_OLLAMA_URL_KEY) : null;
  if (saved) return normalizeBase(saved);

  if (typeof window === "undefined") {
    return DEFAULT_DIRECT_OLLAMA_URL;
  }

  return "";
}

export function setOllamaUrl(url: string) {
  const normalized = normalizeBase(url);

  if (!normalized || normalized === "/api") {
    localStorage.removeItem(CUSTOM_OLLAMA_URL_KEY);
    return;
  }

  localStorage.setItem(CUSTOM_OLLAMA_URL_KEY, normalized);
}

export function getOllamaUrl(): string {
  return getOllamaBase() || "/api";
}

async function ollamaFetch(path: string, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const originalSignal = init.signal;
  let timedOut = false;

  const relayAbort = () => controller.abort();

  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort();
    } else {
      originalSignal.addEventListener("abort", relayAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(`${getOllamaBase()}/api${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new Error("Koneksi ke Ollama timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    originalSignal?.removeEventListener("abort", relayAbort);
  }
}

export async function streamChat({
  messages,
  model = "llama3",
  onDelta,
  onDone,
  signal,
}: {
  messages: ChatMessage[];
  model?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await ollamaFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  }, 120000);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${text}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          onDelta(json.message.content);
        }
        if (json.done) {
          onDone();
          return;
        }
      } catch {
        // partial JSON, skip
      }
    }
  }
  onDone();
}

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const resp = await ollamaFetch("/tags", {}, 3000);
    return resp.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const resp = await ollamaFetch("/tags", {}, 5000);
    const data = await resp.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
