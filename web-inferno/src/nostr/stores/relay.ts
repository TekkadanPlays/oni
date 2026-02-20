import { RelayPool } from '../pool';
import type { RelayStatus } from '../relay';

type Listener = () => void;

export interface RelayState {
  statuses: Map<string, RelayStatus>;
  isConnecting: boolean;
}

let pool: RelayPool | null = null;
let state: RelayState = {
  statuses: new Map(),
  isConnecting: false,
};

const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function getRelayState(): RelayState {
  return state;
}

export function subscribeRelay(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPool(): RelayPool {
  if (!pool) {
    pool = new RelayPool();
  }
  return pool;
}

export async function connectRelays(): Promise<void> {
  const p = getPool();
  state = { ...state, isConnecting: true };
  notify();

  await p.connectAll();

  state = { ...state, isConnecting: false, statuses: p.getStatus() };
  notify();
}

export function addRelay(url: string) {
  const p = getPool();
  const relay = p.addRelay(url);
  relay.onStatusChange(() => {
    state = { ...state, statuses: p.getStatus() };
    notify();
  });
  relay.connect().catch(() => {});
  state = { ...state, statuses: p.getStatus() };
  notify();
}

export function removeRelay(url: string) {
  const p = getPool();
  p.removeRelay(url);
  state = { ...state, statuses: p.getStatus() };
  notify();
}
