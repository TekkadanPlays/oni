import { hasNip07, getNip07PublicKey } from '../nip07';
import { isAndroid, requestPublicKey as nip55RequestPubkey, parseNip55Callback, clearNip55Callback } from '../nip55';
import { getPool } from './relay';
import { resetRelayManager } from './relaymanager';
import { resetBootstrap } from './bootstrap';

export interface AuthState {
  pubkey: string | null;
  isLoading: boolean;
  error: string | null;
}

type Listener = () => void;

let state: AuthState = {
  pubkey: null,
  isLoading: false,
  error: null,
};

const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function login(): Promise<void> {
  // Try NIP-07 first (desktop browser extensions)
  if (hasNip07()) {
    state = { ...state, isLoading: true, error: null };
    notify();
    try {
      const pubkey = await getNip07PublicKey();
      state = { pubkey, isLoading: false, error: null };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('oni_pubkey', pubkey);
      }
    } catch (err) {
      state = { ...state, isLoading: false, error: String(err) };
    }
    notify();
    return;
  }

  // Try NIP-55 on Android (Amber / external signer via intent)
  if (isAndroid()) {
    state = { ...state, isLoading: true, error: null };
    notify();
    nip55RequestPubkey();
    return;
  }

  // No signing method available
  state = { ...state, error: 'No Nostr signer found. Install a NIP-07 extension (desktop) or Amber (Android).' };
  notify();
}

/**
 * Reset all per-user stores. Called on sign-out and before account switch.
 */
export function resetAllStores(): void {
  resetBootstrap();
  getPool().clearSeenEvents();
  resetRelayManager();
}

export function logout() {
  resetAllStores();
  state = { pubkey: null, isLoading: false, error: null };
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('oni_pubkey');
  }
  notify();
}

// Restore session from localStorage, then check for NIP-55 callback
export function restoreSession() {
  if (typeof localStorage === 'undefined') return;

  // Check for NIP-55 callback result first (Android signer redirect)
  const nip55 = parseNip55Callback();
  if (nip55 && nip55.action === 'get_public_key' && nip55.result) {
    const pubkey = nip55.result;
    localStorage.setItem('oni_pubkey', pubkey);
    state = { pubkey, isLoading: false, error: null };
    clearNip55Callback();
    notify();
    return;
  }

  // Normal session restore from localStorage
  const saved = localStorage.getItem('oni_pubkey');
  if (saved) {
    state = { pubkey: saved, isLoading: false, error: null };
    notify();
  }
}
