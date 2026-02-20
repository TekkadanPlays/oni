import { getPool } from './relay';
import { addRelay, removeRelay } from './relay';

export interface RelayProfile {
  id: string;
  name: string;
  relays: string[];
  builtin?: boolean;
}

export interface RelayManagerState {
  profiles: RelayProfile[];
  activeProfileId: string;
}

type Listener = () => void;

const STORAGE_KEY = 'oni_relay_profiles';

const DEFAULT_PROFILES: RelayProfile[] = [
  { id: 'outbox', name: 'Outbox', relays: [], builtin: true },
  { id: 'inbox', name: 'Inbox', relays: [], builtin: true },
  { id: 'indexers', name: 'Indexers', relays: [], builtin: true },
];

let state: RelayManagerState = {
  profiles: [...DEFAULT_PROFILES],
  activeProfileId: 'outbox',
};

const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

function persist() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadRelayManager() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as RelayManagerState;
      const builtinIds = new Set(DEFAULT_PROFILES.map((p) => p.id));
      const merged: RelayProfile[] = [];
      for (const def of DEFAULT_PROFILES) {
        const saved_profile = saved.profiles.find((p) => p.id === def.id);
        merged.push(saved_profile ? { ...saved_profile, builtin: true } : { ...def });
      }
      for (const p of saved.profiles) {
        if (!builtinIds.has(p.id)) {
          merged.push({ ...p, builtin: false });
        }
      }
      state = {
        profiles: merged,
        activeProfileId: saved.activeProfileId || 'outbox',
      };
    }
  } catch {
    // ignore parse errors
  }
  notify();
}

export function getRelayManagerState(): RelayManagerState {
  return state;
}

export function subscribeRelayManager(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveProfile(): RelayProfile {
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
}

export function setActiveProfile(profileId: string) {
  state = { ...state, activeProfileId: profileId };
  persist();
  notify();
  syncPoolToActiveProfile();
}

export function addRelayToProfile(profileId: string, url: string) {
  let normalized = url.trim();
  if (!normalized.startsWith('wss://') && !normalized.startsWith('ws://')) {
    normalized = 'wss://' + normalized;
  }
  normalized = normalized.replace(/\/+$/, '');

  state = {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId && !p.relays.includes(normalized)
        ? { ...p, relays: [...p.relays, normalized] }
        : p,
    ),
  };
  persist();
  notify();

  if (profileId === state.activeProfileId) {
    addRelay(normalized);
  }
}

export function removeRelayFromProfile(profileId: string, url: string) {
  state = {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId
        ? { ...p, relays: p.relays.filter((r) => r !== url) }
        : p,
    ),
  };
  persist();
  notify();

  if (profileId === state.activeProfileId) {
    removeRelay(url);
  }
}

export function createProfile(name: string): string {
  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  state = {
    ...state,
    profiles: [...state.profiles, { id, name, relays: [], builtin: false }],
  };
  persist();
  notify();
  return id;
}

export function renameProfile(profileId: string, name: string) {
  state = {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId && !p.builtin ? { ...p, name } : p,
    ),
  };
  persist();
  notify();
}

export function deleteProfile(profileId: string) {
  const profile = state.profiles.find((p) => p.id === profileId);
  if (!profile || profile.builtin) return;

  state = {
    ...state,
    profiles: state.profiles.filter((p) => p.id !== profileId),
    activeProfileId: state.activeProfileId === profileId ? 'outbox' : state.activeProfileId,
  };
  persist();
  notify();
}

export function syncPoolToActiveProfile() {
  const pool = getPool();
  const active = getActiveProfile();
  const currentUrls = new Set(pool.allRelays.map((r) => r.url));
  const targetUrls = new Set(active.relays);

  // Remove relays not in active profile
  for (const url of currentUrls) {
    if (!targetUrls.has(url)) {
      pool.removeRelay(url);
    }
  }

  // Add relays from active profile
  for (const url of targetUrls) {
    if (!currentUrls.has(url)) {
      addRelay(url);
    }
  }
}

export function resetRelayManager() {
  state = {
    profiles: [...DEFAULT_PROFILES],
    activeProfileId: 'outbox',
  };
  persist();
  notify();
}
