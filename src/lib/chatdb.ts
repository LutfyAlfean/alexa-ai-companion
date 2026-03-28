export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

const CONV_KEY = "alexa_conversations";
const MSG_KEY = "alexa_messages";

function getConversations(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(CONV_KEY) || "[]");
  } catch { return []; }
}

function saveConversations(convs: Conversation[]) {
  localStorage.setItem(CONV_KEY, JSON.stringify(convs));
}

function getMessages(): StoredMessage[] {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || "[]");
  } catch { return []; }
}

function saveMessages(msgs: StoredMessage[]) {
  localStorage.setItem(MSG_KEY, JSON.stringify(msgs));
}

export const chatDB = {
  createConversation(title: string): Conversation {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const convs = getConversations();
    convs.unshift(conv);
    saveConversations(convs);
    return conv;
  },

  listConversations(): Conversation[] {
    return getConversations().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  deleteConversation(id: string) {
    saveConversations(getConversations().filter(c => c.id !== id));
    saveMessages(getMessages().filter(m => m.conversationId !== id));
  },

  updateConversationTitle(id: string, title: string) {
    const convs = getConversations();
    const conv = convs.find(c => c.id === id);
    if (conv) {
      conv.title = title;
      conv.updatedAt = Date.now();
      saveConversations(convs);
    }
  },

  addMessage(conversationId: string, role: "user" | "assistant", content: string): StoredMessage {
    const msg: StoredMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      createdAt: Date.now(),
    };
    const msgs = getMessages();
    msgs.push(msg);
    saveMessages(msgs);

    // Update conversation timestamp
    const convs = getConversations();
    const conv = convs.find(c => c.id === conversationId);
    if (conv) {
      conv.updatedAt = Date.now();
      saveConversations(convs);
    }
    return msg;
  },

  updateMessage(id: string, content: string) {
    const msgs = getMessages();
    const msg = msgs.find(m => m.id === id);
    if (msg) {
      msg.content = content;
      saveMessages(msgs);
    }
  },

  getConversationMessages(conversationId: string): StoredMessage[] {
    return getMessages()
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  clearAll() {
    localStorage.removeItem(CONV_KEY);
    localStorage.removeItem(MSG_KEY);
  },
};
