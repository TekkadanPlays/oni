// Broadcast Relay Discovery Store
// Discovers relays suitable for broadcasting NIP-53 live events to the network.
// Uses nostr.watch rstate API (fast) with NIP-66 kind 30166 fallback.
// "Broadcast" relays are well-connected, write-accepting relays that maximize
// event propagation across the network.

import { Relay } from '../relay';
import type { NostrEvent } from '../event';

type Listener = () => void;

export interface BroadcastRelay {
  url: string;
  rtt: number;
  nips: number[];
}

export interface BroadcastState {
  relays: BroadcastRelay[];
  selectedUrls: Set<string>;
  isLoading: boolean;
  error: string | null;
  source: 'rstate' | 'nip66' | 'fallback' | 'none';
}

const STORAGE_KEY = 'oni_broadcast_relays_selected';

let state: BroadcastState = {
  relays: [],
  selectedUrls: new Set(),
  isLoading: false,
  error: null,
  source: 'none',
};

const listeners: Set<Listener> = new Set();
let activeDiscovery: Promise<void> | null = null;

function notify() {
  for (const fn of listeners) fn();
}

function persistSelected() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.selectedUrls]));
  }
}

function loadSelected() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      state = { ...state, selectedUrls: new Set(arr) };
    }
  } catch { /* ignore */ }
}

export function getBroadcastState(): BroadcastState {
  return state;
}

export function subscribeBroadcast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSelectedBroadcastUrls(): string[] {
  return [...state.selectedUrls];
}

export function toggleBroadcastRelay(url: string) {
  const next = new Set(state.selectedUrls);
  if (next.has(url)) {
    next.delete(url);
  } else {
    next.add(url);
  }
  state = { ...state, selectedUrls: next };
  persistSelected();
  notify();
}

export function setBroadcastRelaySelected(url: string, selected: boolean) {
  const next = new Set(state.selectedUrls);
  if (selected) next.add(url);
  else next.delete(url);
  state = { ...state, selectedUrls: next };
  persistSelected();
  notify();
}

// Well-known broadcast relays as fallback
const FALLBACK_BROADCAST: BroadcastRelay[] = [
  { url: 'wss://relay.damus.io', rtt: 100, nips: [1, 11, 53] },
  { url: 'wss://nos.lol', rtt: 100, nips: [1, 11, 53] },
  { url: 'wss://relay.nostr.band', rtt: 100, nips: [1, 11, 50, 53] },
  { url: 'wss://relay.snort.social', rtt: 100, nips: [1, 11, 53] },
  { url: 'wss://relay.primal.net', rtt: 100, nips: [1, 11, 53] },
  { url: 'wss://nostr.wine', rtt: 150, nips: [1, 11, 53] },
  { url: 'wss://relay.nostr.wirednet.jp', rtt: 200, nips: [1, 11, 53] },
  { url: 'wss://nostr-pub.wellorder.net', rtt: 150, nips: [1, 11] },
];

const MONITOR_RELAYS = [
  'wss://relay.nostr.watch',
  'wss://history.nostr.watch',
];

/**
 * Discover broadcast relays. Returns cached results if already loaded.
 */
export function discoverBroadcastRelays(count: number = 20): Promise<void> {
  if (state.relays.length > 0 && !state.isLoading) {
    return Promise.resolve();
  }
  if (activeDiscovery) return activeDiscovery;

  loadSelected();
  activeDiscovery = doDiscover(count).finally(() => { activeDiscovery = null; });
  return activeDiscovery;
}

async function doDiscover(count: number): Promise<void> {
  state = { ...state, isLoading: true, error: null };
  notify();

  // 1. Try rstate API
  try {
    const relays = await fetchBroadcastFromRstate(count);
    if (relays.length > 0) {
      console.log('[broadcast] Discovered', relays.length, 'broadcast relays via rstate');
      state = { ...state, relays, source: 'rstate', isLoading: false, error: null };
      notify();
      return;
    }
  } catch (err) {
    console.warn('[broadcast] rstate unavailable:', err);
  }

  // 2. Instant fallback
  console.log('[broadcast] Using fallback broadcast relays');
  state = {
    ...state,
    relays: FALLBACK_BROADCAST.slice(0, count),
    source: 'fallback',
    isLoading: false,
    error: null,
  };
  notify();

  // 3. Background NIP-66 upgrade
  upgradeViaNip66(count);
}

async function fetchBroadcastFromRstate(count: number): Promise<BroadcastRelay[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    // Query rstate for well-connected relays sorted by connectivity
    const params = new URLSearchParams({
      limit: String(count * 3),
      offset: '0',
      sortBy: 'lastSeen',
      sortOrder: 'desc',
      format: 'detailed',
    });
    const res = await fetch(`/relays?${params}`, {
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`rstate ${res.status}`);

    const data = await res.json();
    const rawRelays: any[] = data.relays || [];

    const scored = rawRelays
      .filter((r: any) => {
        if (!r.relayUrl || !r.relayUrl.startsWith('wss://')) return false;
        if (r.network?.value && r.network.value !== 'clearnet') return false;
        // Prefer relays that accept writes (not read-only)
        if (r.readOnly?.value === true) return false;
        return true;
      })
      .map((r: any) => {
        const nips: number[] = [];
        if (r.supportedNips?.value && Array.isArray(r.supportedNips.value)) {
          for (const n of r.supportedNips.value) {
            nips.push(typeof n === 'number' ? n : parseInt(n, 10));
          }
        }
        return {
          url: r.relayUrl.replace(/\/+$/, ''),
          rtt: r.rtt?.open?.value ?? 9999,
          nips,
        };
      })
      // Sort: prefer relays with NIP-53 support, then by RTT
      .sort((a, b) => {
        const aHas53 = a.nips.includes(53) ? 0 : 1;
        const bHas53 = b.nips.includes(53) ? 0 : 1;
        if (aHas53 !== bHas53) return aHas53 - bHas53;
        return a.rtt - b.rtt;
      });

    const seen = new Set<string>();
    const result: BroadcastRelay[] = [];
    for (const r of scored) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      result.push(r);
      if (result.length >= count) break;
    }

    return result;
  } finally {
    clearTimeout(timer);
  }
}

function upgradeViaNip66(count: number) {
  const relayMap: Map<string, BroadcastRelay> = new Map();
  let completed = 0;
  const timeout = setTimeout(() => finish(), 8000);

  function finish() {
    clearTimeout(timeout);
    if (relayMap.size === 0) return;

    const sorted = Array.from(relayMap.values())
      .sort((a, b) => {
        const aHas53 = a.nips.includes(53) ? 0 : 1;
        const bHas53 = b.nips.includes(53) ? 0 : 1;
        if (aHas53 !== bHas53) return aHas53 - bHas53;
        return a.rtt - b.rtt;
      })
      .slice(0, count);

    if (sorted.length > 0) {
      console.log('[broadcast] Upgraded to', sorted.length, 'relays via NIP-66');
      state = { ...state, relays: sorted, source: 'nip66' };
      notify();
    }
  }

  for (const monitorUrl of MONITOR_RELAYS) {
    const relay = new Relay(monitorUrl);
    relay.connect()
      .then(() => {
        const subId = relay.subscribe(
          [{ kinds: [30166], limit: count * 3 }],
          (event: NostrEvent) => {
            const dTag = event.tags.find((t) => t[0] === 'd');
            if (!dTag || !dTag[1]) return;
            const url = dTag[1].replace(/\/+$/, '');
            if (!url.startsWith('wss://')) return;

            // Check if relay is read-only
            const readOnly = event.tags.find((t) => t[0] === 'R' && t[1] === 'read');
            if (readOnly) return;

            let rtt = 9999;
            const rttTag = event.tags.find((t) => t[0] === 'rtt' && t[1] === 'open');
            if (rttTag && rttTag[2]) rtt = parseInt(rttTag[2], 10) || 9999;

            const nips: number[] = [];
            for (const tag of event.tags) {
              if (tag[0] === 'N' && tag[1]) {
                nips.push(parseInt(tag[1], 10));
              }
            }

            const existing = relayMap.get(url);
            if (!existing || rtt < existing.rtt) {
              relayMap.set(url, { url, rtt, nips });
            }
          },
          () => {
            relay.unsubscribe(subId);
            relay.disconnect();
            completed++;
            if (completed >= MONITOR_RELAYS.length) finish();
          },
        );
      })
      .catch(() => {
        completed++;
        if (completed >= MONITOR_RELAYS.length) finish();
      });
  }
}

export function resetBroadcast() {
  state = {
    relays: [],
    selectedUrls: new Set(),
    isLoading: false,
    error: null,
    source: 'none',
  };
  notify();
}
