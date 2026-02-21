import { Relay } from '../relay';
import { Kind } from '../event';
import type { NostrEvent } from '../event';
import { getIndexerUrls, discoverIndexers, getIndexerState, subscribeIndexers } from './indexers';
import { getPool } from './relay';
import { addRelayToProfile, removeRelayFromProfile, getRelayManagerState } from './relaymanager';
import { signWithExtension } from '../nip07';
import { getAuthState } from './auth';

type Listener = () => void;

export interface BootstrapProfile {
  name: string;
  displayName: string;
  picture: string;
  banner: string;
  about: string;
  nip05: string;
  lud16: string;
}

export interface RelayListEntry {
  url: string;
  read: boolean;
  write: boolean;
}

export type BootstrapPhase =
  | 'idle'
  | 'discovering_indexers'
  | 'querying_indexers'
  | 'connecting_relays'
  | 'ready'
  | 'error';

export interface BootstrapState {
  phase: BootstrapPhase;
  profile: BootstrapProfile | null;
  profileEvent: NostrEvent | null;
  relayList: RelayListEntry[];
  relayListEvent: NostrEvent | null;
  contactsEvent: NostrEvent | null;
  followingCount: number;
  indexersQueried: number;
  indexersResponded: number;
  outboxConnected: number;
  inboxConnected: number;
  error: string | null;
}

let state: BootstrapState = {
  phase: 'idle',
  profile: null,
  profileEvent: null,
  relayList: [],
  relayListEvent: null,
  contactsEvent: null,
  followingCount: 0,
  indexersQueried: 0,
  indexersResponded: 0,
  outboxConnected: 0,
  inboxConnected: 0,
  error: null,
};

const listeners: Set<Listener> = new Set();

let notifyScheduled = false;
function notify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    for (const fn of listeners) fn();
  });
}

export function getBootstrapState(): BootstrapState {
  return state;
}

export function subscribeBootstrap(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let ephemeralRelays: Relay[] = [];
let bootstrappedPubkey: string | null = null;
let activeBootstrap: Promise<void> | null = null;

export function resetBootstrap(): void {
  cleanupEphemeral();
  bootstrappedPubkey = null;
  activeBootstrap = null;
  state = {
    phase: 'idle',
    profile: null,
    profileEvent: null,
    relayList: [],
    relayListEvent: null,
    contactsEvent: null,
    followingCount: 0,
    indexersQueried: 0,
    indexersResponded: 0,
    outboxConnected: 0,
    inboxConnected: 0,
    error: null,
  };
  notify();
}

export async function bootstrapUser(pubkey: string): Promise<void> {
  if (bootstrappedPubkey === pubkey && state.phase === 'ready') {
    return;
  }
  if (bootstrappedPubkey === pubkey && activeBootstrap) {
    return activeBootstrap;
  }

  bootstrappedPubkey = pubkey;
  activeBootstrap = doBootstrap(pubkey).finally(() => {
    activeBootstrap = null;
  });
  return activeBootstrap;
}

async function doBootstrap(pubkey: string): Promise<void> {
  state = {
    phase: 'discovering_indexers',
    profile: null,
    profileEvent: null,
    relayList: [],
    relayListEvent: null,
    contactsEvent: null,
    followingCount: 0,
    indexersQueried: 0,
    indexersResponded: 0,
    outboxConnected: 0,
    inboxConnected: 0,
    error: null,
  };
  notify();

  // 1. Discover indexers if not already done
  const indexerState = getIndexerState();
  if (indexerState.urls.length === 0) {
    await discoverIndexers(10);
  }

  const indexerUrls = getIndexerUrls();
  if (indexerUrls.length === 0) {
    state = { ...state, phase: 'error', error: 'No indexer relays found' };
    notify();
    return;
  }

  // Populate Indexers relay manager profile
  syncIndexersToManager(indexerUrls);

  // Listen for NIP-66 background upgrades
  subscribeIndexers(() => {
    const upgraded = getIndexerUrls();
    if (upgraded.length > 0) {
      syncIndexersToManager(upgraded);
    }
  });

  // 2. Query indexers for kind-0, kind-10002, kind-3
  state = { ...state, phase: 'querying_indexers', indexersQueried: indexerUrls.length };
  notify();

  await queryIndexers(pubkey, indexerUrls);

  // 3. Connect to outbox/inbox relays
  if (state.relayList.length > 0) {
    state = { ...state, phase: 'connecting_relays' };
    notify();
    await connectUserRelays(state.relayList);
  }

  // 4. Done
  state = { ...state, phase: 'ready' };
  notify();

  cleanupEphemeral();
}

function queryIndexers(pubkey: string, indexerUrls: string[]): Promise<void> {
  return new Promise<void>((resolve) => {
    let responded = 0;
    const total = indexerUrls.length;
    const timeout = setTimeout(() => finish(), 15000);

    function finish() {
      clearTimeout(timeout);
      resolve();
    }

    function onIndexerDone() {
      responded++;
      state = { ...state, indexersResponded: responded };
      notify();
      if (responded >= total) finish();
    }

    for (const url of indexerUrls) {
      const relay = new Relay(url);
      ephemeralRelays.push(relay);

      relay.connect()
        .then(() => {
          if (relay.status !== 'connected') {
            onIndexerDone();
            return;
          }

          const subId = relay.subscribe(
            [
              { kinds: [Kind.Metadata], authors: [pubkey], limit: 1 },
              { kinds: [Kind.RelayList], authors: [pubkey], limit: 1 },
              { kinds: [Kind.Contacts], authors: [pubkey], limit: 1 },
            ],
            (event: NostrEvent) => {
              if (event.kind === Kind.Metadata) {
                if (!state.profileEvent || event.created_at > state.profileEvent.created_at) {
                  state = {
                    ...state,
                    profileEvent: event,
                    profile: parseProfile(event),
                  };
                  notify();
                }
              } else if (event.kind === Kind.RelayList) {
                if (!state.relayListEvent || event.created_at > state.relayListEvent.created_at) {
                  state = {
                    ...state,
                    relayListEvent: event,
                    relayList: parseRelayList(event),
                  };
                  notify();
                }
              } else if (event.kind === Kind.Contacts) {
                if (!state.contactsEvent || event.created_at > state.contactsEvent.created_at) {
                  const count = event.tags.filter((t) => t[0] === 'p' && t[1]).length;
                  state = {
                    ...state,
                    contactsEvent: event,
                    followingCount: count,
                  };
                  notify();
                }
              }
            },
            () => {
              relay.unsubscribe(subId);
              onIndexerDone();
            },
          );
        })
        .catch(() => {
          onIndexerDone();
        });
    }
  });
}

async function connectUserRelays(relayList: RelayListEntry[]): Promise<void> {
  const pool = getPool();
  const mgr = getRelayManagerState();

  const writeRelays = relayList.filter((r) => r.write).map((r) => r.url);
  const readRelays = relayList.filter((r) => r.read).map((r) => r.url);

  const outbox = mgr.profiles.find((p) => p.id === 'outbox');
  const inbox = mgr.profiles.find((p) => p.id === 'inbox');

  for (const url of writeRelays) {
    if (outbox && !outbox.relays.includes(url)) {
      addRelayToProfile('outbox', url);
    }
  }
  for (const url of readRelays) {
    if (inbox && !inbox.relays.includes(url)) {
      addRelayToProfile('inbox', url);
    }
  }

  const allUrls = new Set([...writeRelays, ...readRelays]);
  const connectPromises: Promise<void>[] = [];

  for (const url of allUrls) {
    const existing = pool.getRelay(url);
    if (!existing) {
      const relay = pool.addRelayWithAuth(url);
      connectPromises.push(
        relay.connect()
          .then(() => {
            if (writeRelays.includes(url)) {
              state = { ...state, outboxConnected: state.outboxConnected + 1 };
            }
            if (readRelays.includes(url)) {
              state = { ...state, inboxConnected: state.inboxConnected + 1 };
            }
            notify();
          })
          .catch((err) => {
            console.warn(`[bootstrap] Failed to connect to ${url}:`, err);
          }),
      );
    }
  }

  await Promise.allSettled(connectPromises);
}

function syncIndexersToManager(indexerUrls: string[]) {
  const mgr = getRelayManagerState();
  const indexers = mgr.profiles.find((p) => p.id === 'indexers');
  if (!indexers) return;

  for (const url of indexers.relays) {
    if (!indexerUrls.includes(url)) {
      removeRelayFromProfile('indexers', url);
    }
  }
  for (const url of indexerUrls) {
    if (!indexers.relays.includes(url)) {
      addRelayToProfile('indexers', url);
    }
  }
}

function cleanupEphemeral() {
  for (const relay of ephemeralRelays) {
    const pool = getPool();
    if (!pool.getRelay(relay.url)) {
      relay.disconnect();
    }
  }
  ephemeralRelays = [];
}

function parseProfile(event: NostrEvent): BootstrapProfile {
  let meta: Record<string, string> = {};
  try {
    meta = JSON.parse(event.content);
  } catch { /* ignore */ }

  return {
    name: meta.name || '',
    displayName: meta.display_name || meta.displayName || '',
    picture: meta.picture || '',
    banner: meta.banner || '',
    about: meta.about || '',
    nip05: meta.nip05 || '',
    lud16: meta.lud16 || '',
  };
}

function parseRelayList(event: NostrEvent): RelayListEntry[] {
  const relays: RelayListEntry[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'r' || !tag[1]) continue;
    const url = tag[1].replace(/\/+$/, '');
    const marker = tag[2];
    relays.push({
      url,
      read: !marker || marker === 'read',
      write: !marker || marker === 'write',
    });
  }
  return relays;
}

export function getOutboxUrls(): string[] {
  return state.relayList.filter((r) => r.write).map((r) => r.url);
}

export function getInboxUrls(): string[] {
  return state.relayList.filter((r) => r.read).map((r) => r.url);
}
