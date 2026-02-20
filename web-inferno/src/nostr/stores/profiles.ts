// Profile fetching store — resolves kind-0 metadata for any pubkey
// Uses indexer relays with in-memory cache + NIP-19 npub fallback
import { Relay } from '../relay';
import { Kind } from '../event';
import type { NostrEvent } from '../event';
import { getIndexerUrls } from './indexers';
import { npubEncode, shortenHex } from '../utils';

export interface NostrProfile {
  pubkey: string;
  name: string;
  displayName: string;
  picture: string;
  banner: string;
  about: string;
  nip05: string;
  lud16: string;
  fetched: boolean;
}

type Listener = () => void;

const cache: Map<string, NostrProfile> = new Map();
const pending: Set<string> = new Set();
const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeProfiles(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get a profile from cache. Returns a stub with npub fallback if not yet fetched.
 */
export function getProfile(pubkey: string): NostrProfile {
  const cached = cache.get(pubkey);
  if (cached) return cached;

  // Return npub fallback stub
  return {
    pubkey,
    name: '',
    displayName: '',
    picture: '',
    banner: '',
    about: '',
    nip05: '',
    lud16: '',
    fetched: false,
  };
}

/**
 * Get display name for a pubkey — profile name or npub1... fallback.
 */
export function getDisplayName(pubkey: string): string {
  const profile = getProfile(pubkey);
  if (profile.displayName) return profile.displayName;
  if (profile.name) return profile.name;
  try {
    const npub = npubEncode(pubkey);
    return npub.slice(0, 12) + '...' + npub.slice(-4);
  } catch {
    return shortenHex(pubkey, 8);
  }
}

/**
 * Get avatar URL for a pubkey, or empty string.
 */
export function getAvatar(pubkey: string): string {
  return getProfile(pubkey).picture;
}

/**
 * Fetch profile for a pubkey from indexer relays. Non-blocking, updates cache.
 */
export function fetchProfile(pubkey: string): void {
  if (cache.has(pubkey) && cache.get(pubkey)!.fetched) return;
  if (pending.has(pubkey)) return;
  pending.add(pubkey);

  const indexerUrls = getIndexerUrls();
  if (indexerUrls.length === 0) {
    pending.delete(pubkey);
    return;
  }

  // Query up to 3 indexers in parallel
  const urls = indexerUrls.slice(0, 3);
  let bestEvent: NostrEvent | null = null;
  let responded = 0;

  function finish() {
    pending.delete(pubkey);
    if (bestEvent) {
      const profile = parseProfileEvent(pubkey, bestEvent);
      cache.set(pubkey, profile);
      notify();
    } else {
      // Mark as fetched (empty) so we don't retry immediately
      cache.set(pubkey, {
        pubkey,
        name: '',
        displayName: '',
        picture: '',
        banner: '',
        about: '',
        nip05: '',
        lud16: '',
        fetched: true,
      });
      notify();
    }
  }

  const timeout = setTimeout(() => finish(), 6000);

  for (const url of urls) {
    const relay = new Relay(url);
    relay.connect()
      .then(() => {
        if (relay.status !== 'connected') {
          responded++;
          if (responded >= urls.length) { clearTimeout(timeout); finish(); }
          return;
        }

        const subId = relay.subscribe(
          [{ kinds: [Kind.Metadata], authors: [pubkey], limit: 1 }],
          (event: NostrEvent) => {
            if (!bestEvent || event.created_at > bestEvent.created_at) {
              bestEvent = event;
            }
          },
          () => {
            relay.unsubscribe(subId);
            relay.disconnect();
            responded++;
            if (responded >= urls.length) { clearTimeout(timeout); finish(); }
          },
        );
      })
      .catch(() => {
        responded++;
        if (responded >= urls.length) { clearTimeout(timeout); finish(); }
      });
  }
}

/**
 * Batch fetch profiles for multiple pubkeys.
 */
export function fetchProfiles(pubkeys: string[]): void {
  for (const pk of pubkeys) {
    fetchProfile(pk);
  }
}

function parseProfileEvent(pubkey: string, event: NostrEvent): NostrProfile {
  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(event.content);
  } catch { /* ignore */ }

  return {
    pubkey,
    name: meta.name || '',
    displayName: meta.display_name || meta.displayName || '',
    picture: meta.picture || '',
    banner: meta.banner || '',
    about: meta.about || '',
    nip05: meta.nip05 || '',
    lud16: meta.lud16 || '',
    fetched: true,
  };
}

export function resetProfiles(): void {
  cache.clear();
  pending.clear();
}
