import { Plus, Trash2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/chatdb";
import logoImg from "/logo.png";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ChatSidebar = ({ conversations, activeId, onSelect, onNew, onDelete }: Props) => {
  return (
    <div className="w-72 h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={logoImg} alt="Alexa AI" className="w-8 h-8 heartbeat" />
        <h1 className="font-display font-bold text-lg gradient-text">Alexa AI</h1>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full justify-start gap-2 border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Chat Baru
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <AnimatePresence>
          {conversations.map((conv) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group"
            >
              <button
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 flex items-center gap-2 text-sm transition-all ${
                  activeId === conv.id
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <span
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          Ollama · OpenClaw
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
