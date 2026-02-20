// NIP-53 Live Events Store
// Monitors stream status and auto-publishes/updates live activity events
import type { NostrEvent } from '../event';
import { createLiveEvent, publishLiveEvent, updateLiveEvent } from '../nip53';
import { getAuthState } from './auth';
import { getBootstrapState } from './bootstrap';

type Listener = () => void;

export interface LiveEventState {
  currentEvent: NostrEvent | null;
  isPublishing: boolean;
  lastPublished: string | null;
  error: string | null;
  enabled: boolean;
}

let state: LiveEventState = {
  currentEvent: null,
  isPublishing: false,
  lastPublished: null,
  error: null,
  enabled: false,
};

const listeners: Set<Listener> = new Set();
let updateInterval: ReturnType<typeof setInterval> | null = null;

function notify() {
  for (const fn of listeners) fn();
}

export function getLiveEventState(): LiveEventState {
  return state;
}

export function subscribeLiveEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLiveEventsEnabled(enabled: boolean) {
  state = { ...state, enabled };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('oni_live_events_enabled', enabled ? '1' : '0');
  }
  notify();
}

export function loadLiveEventsEnabled() {
  if (typeof localStorage === 'undefined') return;
  const saved = localStorage.getItem('oni_live_events_enabled');
  if (saved !== null) {
    state = { ...state, enabled: saved === '1' };
    notify();
  }
}

/**
 * Get the relay URLs to publish live events to.
 * Uses the user's outbox relays from bootstrap.
 */
function getPublishRelays(): string[] {
  const bs = getBootstrapState();
  const outbox = bs.relayList.filter((r) => r.write).map((r) => r.url);
  if (outbox.length > 0) return outbox;

  // Fallback to well-known relays
  return [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
  ];
}

/**
 * Called when stream goes live. Creates and publishes a NIP-53 live event.
 */
export async function onStreamStart(streamTitle: string, viewerCount: number): Promise<void> {
  const auth = getAuthState();
  if (!auth.pubkey || !state.enabled) return;

  state = { ...state, isPublishing: true, error: null };
  notify();

  try {
    const relays = getPublishRelays();
    const event = await createLiveEvent(auth.pubkey, {
      identifier: `oni-${Date.now()}`,
      title: streamTitle || 'Live Stream',
      status: 'live',
      streamingUrl: `${window.location.origin}/hls/stream.m3u8`,
      starts: Math.floor(Date.now() / 1000),
      currentParticipants: viewerCount,
      participants: [{ pubkey: auth.pubkey, role: 'Host' }],
      relays,
    });

    if (event) {
      const { published } = await publishLiveEvent(event, relays);
      if (published) {
        console.log('[liveevents] Published live event:', event.id);
        state = {
          ...state,
          currentEvent: event,
          isPublishing: false,
          lastPublished: new Date().toISOString(),
        };

        // Set up periodic updates (every 60s)
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
          periodicUpdate(streamTitle, viewerCount);
        }, 60000);
      } else {
        state = { ...state, isPublishing: false, error: 'Failed to publish to any relay' };
      }
    } else {
      state = { ...state, isPublishing: false, error: 'Failed to create event (signer rejected?)' };
    }
  } catch (err) {
    state = { ...state, isPublishing: false, error: String(err) };
  }
  notify();
}

/**
 * Called when stream goes offline. Updates the live event status to 'ended'.
 */
export async function onStreamEnd(): Promise<void> {
  const auth = getAuthState();
  if (!auth.pubkey || !state.currentEvent) return;

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  try {
    const relays = getPublishRelays();
    const endedEvent = await updateLiveEvent(auth.pubkey, state.currentEvent, {
      status: 'ended',
      ends: Math.floor(Date.now() / 1000),
    });

    if (endedEvent) {
      await publishLiveEvent(endedEvent, relays);
      console.log('[liveevents] Published stream ended event');
    }
  } catch (err) {
    console.error('[liveevents] Error ending live event:', err);
  }

  state = { ...state, currentEvent: null };
  notify();
}

/**
 * Periodic update of the live event (viewer count, title changes).
 */
async function periodicUpdate(streamTitle: string, viewerCount: number): Promise<void> {
  const auth = getAuthState();
  if (!auth.pubkey || !state.currentEvent) return;

  try {
    const relays = getPublishRelays();
    const updated = await updateLiveEvent(auth.pubkey, state.currentEvent, {
      title: streamTitle || 'Live Stream',
      currentParticipants: viewerCount,
      status: 'live',
    });

    if (updated) {
      state = { ...state, currentEvent: updated, lastPublished: new Date().toISOString() };
      await publishLiveEvent(updated, relays);
      notify();
    }
  } catch (err) {
    console.error('[liveevents] Error updating live event:', err);
  }
}

export function resetLiveEvents() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  state = {
    currentEvent: null,
    isPublishing: false,
    lastPublished: null,
    error: null,
    enabled: state.enabled, // preserve enabled setting
  };
  notify();
}
