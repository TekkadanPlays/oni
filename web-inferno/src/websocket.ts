import { MessageType } from './types';
import type { SocketEvent, ChatMessage } from './types';

export type MessageHandler = (event: SocketEvent) => void;

const RECONNECT_DELAY_BASE = 1000;
const RECONNECT_DELAY_MAX = 30000;
const PING_INTERVAL = 10000;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private accessToken: string = '';
  private handlers: Map<MessageType, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private connected = false;

  constructor(host?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = host || window.location.host;
    this.url = `${protocol}//${wsHost}/ws`;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  on(type: MessageType, handler: MessageHandler) {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  off(type: MessageType, handler: MessageHandler) {
    const existing = this.handlers.get(type) || [];
    this.handlers.set(type, existing.filter(h => h !== handler));
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    const url = this.accessToken ? `${this.url}?accessToken=${this.accessToken}` : this.url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.startPing();
      console.log('[WS] Connected');
    };

    this.ws.onclose = (e) => {
      this.connected = false;
      this.stopPing();
      console.log(`[WS] Disconnected (code=${e.code})`);
      this.scheduleReconnect();
    };

    this.ws.onerror = (e) => {
      console.error('[WS] Error:', e);
    };

    this.ws.onmessage = (e) => {
      try {
        const event: SocketEvent = JSON.parse(e.data);
        if (event.type === MessageType.PONG) return;
        this.dispatch(event);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };
  }

  disconnect() {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  send(message: string) {
    if (this.ws && this.connected) {
      this.ws.send(message);
    }
  }

  sendChat(body: string) {
    this.send(JSON.stringify({ type: MessageType.CHAT, body }));
  }

  isConnected(): boolean {
    return this.connected;
  }

  private dispatch(event: SocketEvent) {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    // Also dispatch to wildcard handlers if any
    const allHandlers = this.handlers.get('*' as MessageType);
    if (allHandlers) {
      for (const handler of allHandlers) {
        handler(event);
      }
    }
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send(JSON.stringify({ type: MessageType.PING }));
    }, PING_INTERVAL);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_DELAY_BASE * Math.pow(2, this.reconnectAttempts),
      RECONNECT_DELAY_MAX
    );
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
