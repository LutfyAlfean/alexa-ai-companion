import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: Props) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div className="p-4">
      <div className="glass-panel glow-border flex items-end gap-2 p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ketik pesan ke Alexa..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground px-2 py-2 font-body"
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-lg bg-primary/20 hover:bg-primary/40 text-primary transition-all"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Alexa AI · Powered by Ollama & OpenClaw
      </p>
    </div>
  );
};

export default ChatInput;
