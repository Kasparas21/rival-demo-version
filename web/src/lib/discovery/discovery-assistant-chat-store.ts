import type { DiscoveryAssistantResponse } from "@/lib/discovery/discovery-assistant-types";
import type { DiscoveryAdDto } from "@/lib/discovery/types";

export type DiscoveryChatEntry = {
  role: "user" | "assistant";
  content: string;
  adRefs?: DiscoveryAssistantResponse["ad_refs"];
  discoveryAds?: DiscoveryAdDto[];
  visualStats?: DiscoveryAssistantResponse["visual_stats"];
  suggestions?: string[];
};

export type DiscoveryChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: DiscoveryChatEntry[];
};

type DiscoveryChatStore = {
  sessions: DiscoveryChatSession[];
  activeSessionId: string | null;
};

const STORE_KEY = (brandId: string) => `rival_discovery_chat_sessions_${brandId}`;
const MAX_SESSIONS = 50;

function emptyStore(): DiscoveryChatStore {
  return { sessions: [], activeSessionId: null };
}

function readStore(brandId: string): DiscoveryChatStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORE_KEY(brandId));
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as DiscoveryChatStore;
    if (!parsed || !Array.isArray(parsed.sessions)) return emptyStore();
    return {
      sessions: parsed.sessions,
      activeSessionId: parsed.activeSessionId ?? null,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(brandId: string, store: DiscoveryChatStore): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed: DiscoveryChatStore = {
      activeSessionId: store.activeSessionId,
      sessions: store.sessions.slice(0, MAX_SESSIONS),
    };
    localStorage.setItem(STORE_KEY(brandId), JSON.stringify(trimmed));
  } catch {
    /* ignore quota */
  }
}

function sessionTitleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 56 ? `${t.slice(0, 55)}…` : t;
}

function newSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function listDiscoveryChatSessions(brandId: string): DiscoveryChatSession[] {
  return readStore(brandId).sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getActiveDiscoveryChatSession(brandId: string): DiscoveryChatSession | null {
  const store = readStore(brandId);
  if (!store.activeSessionId) return null;
  return store.sessions.find((s) => s.id === store.activeSessionId) ?? null;
}

export function loadDiscoveryChatSession(brandId: string, sessionId: string): DiscoveryChatSession | null {
  const store = readStore(brandId);
  const session = store.sessions.find((s) => s.id === sessionId) ?? null;
  if (!session) return null;
  writeStore(brandId, { ...store, activeSessionId: sessionId });
  return session;
}

export function createDiscoveryChatSession(brandId: string): DiscoveryChatSession {
  const store = readStore(brandId);
  const session: DiscoveryChatSession = {
    id: newSessionId(),
    title: "New chat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  writeStore(brandId, {
    sessions: [session, ...store.sessions],
    activeSessionId: session.id,
  });
  return session;
}

export function ensureActiveDiscoveryChatSession(brandId: string): DiscoveryChatSession {
  const active = getActiveDiscoveryChatSession(brandId);
  if (active) return active;
  return createDiscoveryChatSession(brandId);
}

export function saveDiscoveryChatMessages(
  brandId: string,
  sessionId: string,
  messages: DiscoveryChatEntry[],
): void {
  const store = readStore(brandId);
  const now = new Date().toISOString();
  const firstUser = messages.find((m) => m.role === "user");
  const title = firstUser ? sessionTitleFromMessage(firstUser.content) : "New chat";

  const idx = store.sessions.findIndex((s) => s.id === sessionId);
  const updated: DiscoveryChatSession = {
    id: sessionId,
    title,
    createdAt: idx >= 0 ? store.sessions[idx]!.createdAt : now,
    updatedAt: now,
    messages: messages.slice(-80),
  };

  const sessions =
    idx >= 0
      ? store.sessions.map((s, i) => (i === idx ? updated : s))
      : [updated, ...store.sessions];

  writeStore(brandId, {
    sessions: sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    activeSessionId: sessionId,
  });
}

export function deleteDiscoveryChatSession(brandId: string, sessionId: string): string | null {
  const store = readStore(brandId);
  const sessions = store.sessions.filter((s) => s.id !== sessionId);
  const nextActive =
    store.activeSessionId === sessionId ? (sessions[0]?.id ?? null) : store.activeSessionId;
  writeStore(brandId, { sessions, activeSessionId: nextActive });
  return nextActive;
}

/** Migrate legacy single-thread storage into a session. */
export function migrateLegacyDiscoveryChat(brandId: string): void {
  const legacyKey = `rival_discovery_chat_${brandId}`;
  if (typeof window === "undefined") return;
  const store = readStore(brandId);
  if (store.sessions.length > 0) {
    try {
      localStorage.removeItem(legacyKey);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as DiscoveryChatEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const session = createDiscoveryChatSession(brandId);
    saveDiscoveryChatMessages(brandId, session.id, parsed);
    localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}
