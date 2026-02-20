import type { NostrEvent, UnsignedEvent } from './event';
import { Kind, createEvent } from './event';
import type { NostrFilter } from './filter';

export type RelayStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RelayMessage {
  type: 'EVENT' | 'EOSE' | 'OK' | 'NOTICE' | 'AUTH' | 'CLOSED';
  subscriptionId?: string;
  event?: NostrEvent;
  eventId?: string;
  accepted?: boolean;
  message?: string;
}

export interface Subscription {
  id: string;
  filters: NostrFilter[];
  onEvent: (event: NostrEvent) => void;
  onEose?: () => void;
  onClosed?: (message: string) => void;
}

let subCounter = 0;
function nextSubId(): string {
  return `sub_${++subCounter}_${Date.now().toString(36)}`;
}

export type AuthSigner = (event: UnsignedEvent) => Promise<NostrEvent>;

export class Relay {
  readonly url: string;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private pendingPublish: Map<string, { resolve: (r: { accepted: boolean; message: string }) => void; timer: ReturnType<typeof setTimeout> }> = new Map();
  private pendingMessages: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 60000;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private _status: RelayStatus = 'disconnected';
  private statusListeners: Set<(status: RelayStatus) => void> = new Set();
  private _authSigner: AuthSigner | null = null;
  private _authenticated = false;
  private _authInProgress = false;

  constructor(url: string) {
    this.url = url.replace(/\/$/, '');
  }

  setAuthSigner(signer: AuthSigner | null) {
    this._authSigner = signer;
  }

  get hasAuthSigner(): boolean {
    return this._authSigner !== null;
  }

  get authenticated(): boolean {
    return this._authenticated;
  }

  get status(): RelayStatus {
    return this._status;
  }

  private setStatus(status: RelayStatus) {
    this._status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  onStatusChange(listener: (status: RelayStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.setStatus('connecting');

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        this.setStatus('error');
        resolve();
        return;
      }

      let resolved = false;

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectDelay = 1000;
        this.reconnectAttempts = 0;

        for (const msg of this.pendingMessages) {
          this.ws!.send(msg);
        }
        this.pendingMessages = [];

        for (const [id, sub] of this.subscriptions) {
          const msg = JSON.stringify(['REQ', id, ...sub.filters]);
          this.ws!.send(msg);
        }

        if (!resolved) { resolved = true; resolve(); }
      };

      this.ws.onmessage = (e: MessageEvent) => {
        this.handleMessage(e.data as string);
      };

      this.ws.onerror = () => {
        this.setStatus('error');
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.ws = null;
        if (!resolved) { resolved = true; resolve(); }
        this.scheduleReconnect();
      };
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const [_id, pending] of this.pendingPublish) {
      clearTimeout(pending.timer);
      pending.resolve({ accepted: false, message: 'disconnected' });
    }
    this.pendingPublish.clear();
    this.subscriptions.clear();
    this.pendingMessages = [];
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.warn(`[Relay ${this.url}] Max reconnect attempts (${this.maxReconnectAttempts}) reached, giving up`);
      this.setStatus('error');
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  private handleMessage(raw: string) {
    let parsed: unknown[];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!Array.isArray(parsed) || parsed.length < 2) return;

    const type = parsed[0] as string;

    switch (type) {
      case 'EVENT': {
        const subId = parsed[1] as string;
        const event = parsed[2] as NostrEvent;
        const sub = this.subscriptions.get(subId);
        if (sub) sub.onEvent(event);
        break;
      }
      case 'EOSE': {
        const subId = parsed[1] as string;
        const sub = this.subscriptions.get(subId);
        if (sub?.onEose) sub.onEose();
        break;
      }
      case 'OK': {
        const eventId = parsed[1] as string;
        const pending = this.pendingPublish.get(eventId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingPublish.delete(eventId);
          pending.resolve({ accepted: !!parsed[2], message: (parsed[3] as string) || '' });
        }
        break;
      }
      case 'NOTICE': {
        console.warn(`[Relay ${this.url}] NOTICE:`, parsed[1]);
        break;
      }
      case 'CLOSED': {
        const subId = parsed[1] as string;
        const message = parsed[2] as string || '';
        const sub = this.subscriptions.get(subId);
        if (sub?.onClosed) sub.onClosed(message);
        this.subscriptions.delete(subId);
        break;
      }
      case 'AUTH': {
        const challenge = parsed[1] as string;
        this.handleAuthChallenge(challenge);
        break;
      }
    }
  }

  private _authFailed = false;

  private async handleAuthChallenge(challenge: string) {
    if (!this._authSigner) return;
    if (this._authInProgress) return;
    if (this._authFailed) return;
    this._authInProgress = true;

    try {
      const unsigned = createEvent(
        Kind.ClientAuth,
        '',
        [
          ['relay', this.url],
          ['challenge', challenge],
        ],
      );
      const signed = await this._authSigner(unsigned);
      this.send(JSON.stringify(['AUTH', signed]));
      this._authenticated = true;
    } catch (err) {
      this._authFailed = true;
      console.warn(`[Relay ${this.url}] AUTH declined by signer`);
    } finally {
      this._authInProgress = false;
    }
  }

  private send(msg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.pendingMessages.push(msg);
    }
  }

  subscribe(
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    onEose?: () => void,
    onClosed?: (message: string) => void,
  ): string {
    const id = nextSubId();
    this.subscriptions.set(id, { id, filters, onEvent, onEose, onClosed });
    this.send(JSON.stringify(['REQ', id, ...filters]));
    return id;
  }

  unsubscribe(subId: string) {
    if (this.subscriptions.has(subId)) {
      this.send(JSON.stringify(['CLOSE', subId]));
      this.subscriptions.delete(subId);
    }
  }

  publish(event: NostrEvent): Promise<{ accepted: boolean; message: string }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingPublish.delete(event.id);
        resolve({ accepted: false, message: 'timeout' });
      }, 10000);

      this.pendingPublish.set(event.id, { resolve, timer });
      this.send(JSON.stringify(['EVENT', event]));
    });
  }

  get activeSubscriptions(): number {
    return this.subscriptions.size;
  }
}
