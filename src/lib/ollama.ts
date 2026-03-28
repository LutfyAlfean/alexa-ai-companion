export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const OLLAMA_BASE = "http://localhost:11434";

export async function streamChat({
  messages,
  model = "openclaw",
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
  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
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
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<string[]> {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await resp.json();
    return (data.models || []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
