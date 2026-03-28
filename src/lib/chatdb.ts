import { openDB, type IDBPDatabase } from "idb";

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

interface AlexaDB {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { "by-updated": number };
  };
  messages: {
    key: string;
    value: StoredMessage;
    indexes: { "by-conversation": string; "by-created": number };
  };
}

let dbPromise: Promise<IDBPDatabase<AlexaDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AlexaDB>("alexa-ai-db", 1, {
      upgrade(db) {
        const convStore = db.createObjectStore("conversations", { keyPath: "id" });
        convStore.createIndex("by-updated", "updatedAt");

        const msgStore = db.createObjectStore("messages", { keyPath: "id" });
        msgStore.createIndex("by-conversation", "conversationId");
        msgStore.createIndex("by-created", "createdAt");
      },
    });
  }
  return dbPromise;
}

export const chatDB = {
  async createConversation(title: string): Promise<Conversation> {
    const db = await getDB();
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put("conversations", conv);
    return conv;
  },

  async listConversations(): Promise<Conversation[]> {
    const db = await getDB();
    const all = await db.getAll("conversations");
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async deleteConversation(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["conversations", "messages"], "readwrite");
    await tx.objectStore("conversations").delete(id);
    const msgStore = tx.objectStore("messages");
    const msgs = await msgStore.index("by-conversation").getAllKeys(id);
    for (const key of msgs) {
      await msgStore.delete(key);
    }
    await tx.done;
  },

  async updateConversationTitle(id: string, title: string): Promise<void> {
    const db = await getDB();
    const conv = await db.get("conversations", id);
    if (conv) {
      conv.title = title;
      conv.updatedAt = Date.now();
      await db.put("conversations", conv);
    }
  },

  async addMessage(conversationId: string, role: "user" | "assistant", content: string): Promise<StoredMessage> {
    const db = await getDB();
    const msg: StoredMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      createdAt: Date.now(),
    };
    const tx = db.transaction(["messages", "conversations"], "readwrite");
    await tx.objectStore("messages").put(msg);
    const conv = await tx.objectStore("conversations").get(conversationId);
    if (conv) {
      conv.updatedAt = Date.now();
      await tx.objectStore("conversations").put(conv);
    }
    await tx.done;
    return msg;
  },

  async updateMessage(id: string, content: string): Promise<void> {
    const db = await getDB();
    const msg = await db.get("messages", id);
    if (msg) {
      msg.content = content;
      await db.put("messages", msg);
    }
  },

  async getConversationMessages(conversationId: string): Promise<StoredMessage[]> {
    const db = await getDB();
    const msgs = await db.getAllFromIndex("messages", "by-conversation", conversationId);
    return msgs.sort((a, b) => a.createdAt - b.createdAt);
  },

  async clearAll(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(["conversations", "messages"], "readwrite");
    await tx.objectStore("conversations").clear();
    await tx.objectStore("messages").clear();
    await tx.done;
  },
};
