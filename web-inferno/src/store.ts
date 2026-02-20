import type { ServerStatus, ClientConfig, ChatMessage, CurrentUser, SocketEvent, VisibilityUpdateEvent } from './types';
import { MessageType } from './types';
import { WebSocketService } from './websocket';
import { api } from './api';
import { getLocalStorage, setLocalStorage, removeLocalStorage, STORAGE_KEYS } from './utils';

type Listener = () => void;

export interface AppState {
  loading: boolean;
  config: ClientConfig | null;
  status: ServerStatus | null;
  messages: ChatMessage[];
  currentUser: CurrentUser | null;
  accessToken: string | null;
  isMobile: boolean;
  chatVisible: boolean;
  error: string | null;
}

const listeners: Set<Listener> = new Set();
let notifyQueued = false;

function notify() {
  if (notifyQueued) return;
  notifyQueued = true;
  queueMicrotask(() => {
    notifyQueued = false;
    for (const fn of listeners) fn();
  });
}

// Hydrate from Go-injected window globals
const hydratedConfig = (window as any).configHydration as ClientConfig | undefined;
const hydratedStatus = (window as any).statusHydration as ServerStatus | undefined;

const state: AppState = {
  loading: !hydratedConfig,
  config: hydratedConfig || null,
  status: hydratedStatus || null,
  messages: [],
  currentUser: null,
  accessToken: getLocalStorage(STORAGE_KEYS.accessToken),
  isMobile: window.innerWidth <= 768,
  chatVisible: true,
  error: null,
};

let ws: WebSocketService | null = null;
let statusPollTimer: ReturnType<typeof setInterval> | null = null;

// Restore user from localStorage
const savedUserId = getLocalStorage(STORAGE_KEYS.userId);
const savedDisplayName = getLocalStorage(STORAGE_KEYS.displayName);
const savedDisplayColor = getLocalStorage(STORAGE_KEYS.displayColor);
if (savedUserId && savedDisplayName) {
  state.currentUser = {
    id: savedUserId,
    displayName: savedDisplayName,
    displayColor: savedDisplayColor ? parseInt(savedDisplayColor, 10) : 0,
  };
}

function setupWebSocket() {
  const hostOverride = state.config?.socketHostOverride;
  ws = new WebSocketService(hostOverride || undefined);

  if (state.accessToken) {
    ws.setAccessToken(state.accessToken);
  }

  ws.on(MessageType.CHAT, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.NAME_CHANGE, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.USER_JOINED, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.USER_PARTED, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.SYSTEM, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.FEDIVERSE_ENGAGEMENT_FOLLOW, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.FEDIVERSE_ENGAGEMENT_LIKE, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.FEDIVERSE_ENGAGEMENT_REPOST, (event) => {
    const msg = event as ChatMessage;
    state.messages = [...state.messages, msg];
    notify();
  });

  ws.on(MessageType.CONNECTED_USER_INFO, (event) => {
    const info = event as any;
    if (info.user) {
      state.currentUser = {
        id: info.user.id,
        displayName: info.user.displayName,
        displayColor: info.user.displayColor,
        isModerator: info.user.isModerator,
      };
      notify();
    }
  });

  ws.on(MessageType.VISIBILITY_UPDATE, (event) => {
    const update = event as unknown as VisibilityUpdateEvent;
    if (update.ids && update.ids.length > 0) {
      const idsSet = new Set(update.ids);
      if (update.visible === false) {
        state.messages = state.messages.filter(m => !idsSet.has(m.id));
      }
      notify();
    }
  });

  ws.on(MessageType.ERROR_NEEDS_REGISTRATION, () => {
    state.currentUser = null;
    state.accessToken = null;
    removeLocalStorage(STORAGE_KEYS.accessToken);
    removeLocalStorage(STORAGE_KEYS.userId);
    removeLocalStorage(STORAGE_KEYS.displayName);
    notify();
  });

  ws.connect();
}

function startStatusPolling() {
  if (statusPollTimer) return;
  statusPollTimer = setInterval(async () => {
    try {
      const status = await api.getStatus();
      state.status = status;
      notify();
    } catch (err) {
      console.error('[Store] Status poll error:', err);
    }
  }, 5000);
}

export const store = {
  getState(): AppState {
    return state;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async init() {
    try {
      // If not hydrated, fetch from API
      if (!state.config) {
        const [config, status] = await Promise.all([
          api.getConfig(),
          api.getStatus(),
        ]);
        state.config = config;
        state.status = status;
      }

      // Load chat history if we have a token
      if (state.accessToken) {
        try {
          const history = await api.getChatHistory(state.accessToken);
          if (Array.isArray(history)) {
            state.messages = history;
          }
        } catch {
          // Token may be expired
        }
      }

      state.loading = false;
      notify();

      setupWebSocket();
      startStatusPolling();
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Failed to load';
      state.loading = false;
      notify();
    }
  },

  async registerUser(displayName: string) {
    try {
      const result = await api.registerChatUser(displayName);
      state.accessToken = result.accessToken;
      state.currentUser = {
        id: result.id,
        displayName: result.displayName,
        displayColor: result.displayColor,
      };

      setLocalStorage(STORAGE_KEYS.accessToken, result.accessToken);
      setLocalStorage(STORAGE_KEYS.userId, result.id);
      setLocalStorage(STORAGE_KEYS.displayName, result.displayName);
      setLocalStorage(STORAGE_KEYS.displayColor, String(result.displayColor));

      // Reconnect WebSocket with new token
      if (ws) {
        ws.disconnect();
      }
      setupWebSocket();

      // Load chat history
      try {
        const history = await api.getChatHistory(result.accessToken);
        if (Array.isArray(history)) {
          state.messages = history;
        }
      } catch {
        // ignore
      }

      notify();
    } catch (err) {
      console.error('[Store] Registration error:', err);
      throw err;
    }
  },

  sendChat(body: string) {
    if (ws) {
      ws.sendChat(body);
    }
  },

  toggleChat() {
    state.chatVisible = !state.chatVisible;
    notify();
  },

  setMobile(isMobile: boolean) {
    if (state.isMobile !== isMobile) {
      state.isMobile = isMobile;
      notify();
    }
  },

  cleanup() {
    if (ws) {
      ws.disconnect();
      ws = null;
    }
    if (statusPollTimer) {
      clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
    listeners.clear();
  },
};
