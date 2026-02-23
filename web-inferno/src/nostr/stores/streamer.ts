// Streamer Detection Store
// Checks if the current Nostr-authenticated user is the stream admin.
// Uses the same auth check as the admin panel: Bearer ${pubkey} → /api/admin/serverconfig

type Listener = () => void;

export interface StreamerState {
  isStreamer: boolean;
  isChecking: boolean;
  checkedPubkey: string | null;
}

let state: StreamerState = {
  isStreamer: false,
  isChecking: false,
  checkedPubkey: null,
};

const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function getStreamerState(): StreamerState {
  return state;
}

export function subscribeStreamer(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Check if the given pubkey is authorized as the stream admin.
 * Caches result per pubkey to avoid repeated network calls.
 */
export async function checkStreamer(pubkey: string | null): Promise<boolean> {
  if (!pubkey) {
    state = { isStreamer: false, isChecking: false, checkedPubkey: null };
    notify();
    return false;
  }

  // Already checked this pubkey
  if (state.checkedPubkey === pubkey && !state.isChecking) {
    return state.isStreamer;
  }

  state = { ...state, isChecking: true };
  notify();

  try {
    const res = await fetch('/api/admin/serverconfig', {
      headers: { Authorization: `Bearer ${pubkey}` },
    });
    const isStreamer = res.ok;
    state = { isStreamer, isChecking: false, checkedPubkey: pubkey };
    notify();
    return isStreamer;
  } catch {
    state = { isStreamer: false, isChecking: false, checkedPubkey: pubkey };
    notify();
    return false;
  }
}

export function resetStreamer() {
  state = { isStreamer: false, isChecking: false, checkedPubkey: null };
  notify();
}
