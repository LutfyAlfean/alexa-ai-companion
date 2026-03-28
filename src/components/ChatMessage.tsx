import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import logoImg from "/logo.png";

interface Props {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: Props) => {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser ? "bg-secondary" : "bg-primary/20"
      }`}>
        {isUser ? (
          <span className="text-xs font-display font-semibold text-foreground">U</span>
        ) : (
          <img src={logoImg} alt="Alexa" className="w-5 h-5" />
        )}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "glass-panel rounded-tl-sm"
      }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;
