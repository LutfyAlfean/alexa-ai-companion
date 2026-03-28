export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Use same hostname as the page so it works both locally and remotely
function getOllamaBase(): string {
  const saved = localStorage.getItem("alexa-ollama-url");
  if (saved) return saved.replace(/\/$/, "");
  
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:11434`;
}

export function setOllamaUrl(url: string) {
  localStorage.setItem("alexa-ollama-url", url);
}

export function getOllamaUrl(): string {
  return getOllamaBase();
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
  const base = getOllamaBase();
  const resp = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

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
    const base = getOllamaBase();
    const resp = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const base = getOllamaBase();
    const resp = await fetch(`${base}/api/tags`);
    const data = await resp.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
