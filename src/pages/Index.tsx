import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Menu, X, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useIsMobile } from "@/hooks/use-mobile";
import { chatDB, CHAT_DB_ENGINE, CHAT_DB_NAME, type Conversation, type StoredMessage } from "@/lib/chatdb";
import { streamChat, checkOllamaStatus, getOllamaUrl, listModels, type ChatMessage as OllamaMsg } from "@/lib/ollama";
import logoImg from "/logo.png";

const SYSTEM_PROMPT: OllamaMsg = {
  role: "system",
  content: "Kamu adalah Alexa AI, asisten AI yang cerdas, ramah, dan membantu. Kamu menjawab dalam bahasa yang sama dengan pengguna. Kamu bisa membantu coding, menulis, analisis, dan banyak lagi. Jawab dengan jelas dan terstruktur menggunakan markdown.",
};

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("alexa-model") || "llama3");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  // Check Ollama status & load models
  useEffect(() => {
    checkOllamaStatus().then(setOllamaOnline);
    listModels().then(setAvailableModels);
    const interval = setInterval(() => {
      checkOllamaStatus().then(setOllamaOnline);
      listModels().then(setAvailableModels);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshConversations = useCallback(async () => {
    const convs = await chatDB.listConversations();
    setConversations(convs);
  }, []);

  // Load conversations
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) {
      chatDB.getConversationMessages(activeConvId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    stopStreaming();
    setActiveConvId(null);
    setMessages([]);
    setModelMenuOpen(false);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, stopStreaming]);

  const handleSelectConv = useCallback((id: string) => {
    stopStreaming();
    setActiveConvId(id);
    setModelMenuOpen(false);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, stopStreaming]);

  const handleDeleteConv = useCallback(async (id: string) => {
    if (activeConvId === id) {
      stopStreaming();
    }
    await chatDB.deleteConversation(id);
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
    await refreshConversations();
  }, [activeConvId, refreshConversations, stopStreaming]);

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming) return;

    let convId = activeConvId;
    let assistantMsg: StoredMessage | null = null;

    try {
      if (!convId) {
        const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
        const conv = await chatDB.createConversation(title);
        convId = conv.id;
        setActiveConvId(convId);
      }

      await refreshConversations();

      const userMsg = await chatDB.addMessage(convId, "user", text);
      setMessages(prev => [...prev, userMsg]);

      assistantMsg = await chatDB.addMessage(convId, "assistant", "");
      setMessages(prev => [...prev, assistantMsg]);
      await refreshConversations();

      setIsStreaming(true);
      let fullResponse = "";
      const controller = new AbortController();
      abortRef.current = controller;

      const allMsgs = await chatDB.getConversationMessages(convId);
      const ollamaMsgs: OllamaMsg[] = [
        SYSTEM_PROMPT,
        ...allMsgs.filter(m => m.content).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      await streamChat({
        messages: ollamaMsgs,
        model: selectedModel,
        onDelta: (chunk) => {
          fullResponse += chunk;
          setMessages(prev =>
            prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullResponse } : m)
          );
        },
        onDone: async () => {
          if (!assistantMsg) return;
          await chatDB.updateMessage(assistantMsg.id, fullResponse);
          await refreshConversations();
          abortRef.current = null;
          setIsStreaming(false);
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;

      const errorMsg = err instanceof Error ? err.message : "Gagal menghubungi Ollama";
      const isMemoryError = errorMsg.includes("more system memory") || errorMsg.includes("not enough memory");
      const memoryHint = isMemoryError
        ? `\n\n💡 **Solusi**: Model \`${selectedModel}\` terlalu besar untuk RAM server. Ganti ke model yang lebih kecil:\n- \`tinyllama\` (~1.1 GB RAM)\n- \`phi\` (~1.7 GB RAM)\n\nJalankan: \`ollama pull tinyllama\` lalu pilih dari dropdown di header.`
        : `\n\nPastikan Ollama aktif, model \`${selectedModel}\` sudah terinstall, dan web proxy mengarah ke \`${getOllamaUrl()}\`.`;
      const errorContent = `⚠️ **Error**: ${errorMsg}${memoryHint}`;

      if (assistantMsg) {
        setMessages(prev =>
          prev.map(m => m.id === assistantMsg?.id ? { ...m, content: errorContent } : m)
        );
        await chatDB.updateMessage(assistantMsg.id, errorContent);
      } else {
        toast.error(errorMsg);
      }

      console.error("Alexa AI send error:", err);
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, [activeConvId, isStreaming, selectedModel, refreshConversations]);

  return (
    <div className="flex h-screen chat-gradient overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-card/80 backdrop-blur border border-border/50"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:relative z-40 h-full transition-transform duration-300`}>
        <ChatSidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConv}
          onNew={handleNewChat}
          onDelete={handleDeleteConv}
          currentModel={selectedModel}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div className="lg:hidden fixed inset-0 z-30 bg-background/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/30">
          <div className="flex items-center gap-2 ml-10 lg:ml-0">
            <img src={logoImg} alt="Alexa AI" className="w-6 h-6" />
            <span className="font-display font-semibold text-sm gradient-text">Alexa AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
              <span>DB Lokal</span>
              <span className="text-foreground">{CHAT_DB_ENGINE}</span>
            </div>
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-muted/50 border border-border/50 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
              >
                <span className="max-w-[120px] truncate">{selectedModel}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {modelMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border/50 bg-card/95 backdrop-blur-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  {availableModels.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {ollamaOnline ? "Tidak ada model. Jalankan: ollama pull llama3" : "Ollama offline"}
                    </div>
                  ) : (
                    availableModels.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedModel(m);
                          localStorage.setItem("alexa-model", m);
                          setModelMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-all ${
                          m === selectedModel
                            ? "bg-primary/15 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {m}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ollamaOnline ? "bg-green-500" : ollamaOnline === false ? "bg-destructive" : "bg-muted-foreground"}`} />
              <div className={`w-2 h-2 rounded-full ${ollamaOnline ? "bg-primary" : ollamaOnline === false ? "bg-destructive" : "bg-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">
                {ollamaOnline ? "Online" : ollamaOnline === false ? "Offline" : "Checking..."}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="relative"
              >
                <img src={logoImg} alt="Alexa AI" width={96} height={96} className="heartbeat" />
                <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl animate-pulse-glow" />
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h2 className="font-display text-2xl font-bold gradient-text mb-2">
                  Halo! Saya Alexa AI
                </h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Asisten AI lokal Anda. Tanyakan apa saja — coding, menulis, analisis, dan lainnya. Semua chat tersimpan lokal di {CHAT_DB_ENGINE} <span className="whitespace-nowrap">({CHAT_DB_NAME})</span>.
                </p>
              </motion.div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 max-w-lg"
              >
                {["Jelaskan cara kerja AI", "Buatkan kode Python", "Tulis cerita pendek", "Analisis data CSV"].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="glass-panel px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    {q}
                  </button>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && (
                <div className="flex gap-1 px-16 py-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput onSend={handleSend} sending={isStreaming} />
        </div>
      </div>
    </div>
  );
};

export default Index;
