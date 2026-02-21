import { getPool } from './relay';
import { addRelay, removeRelay } from './relay';

export interface RelayProfile {
  id: string;
  name: string;
  relays: string[];
  builtin?: boolean;
  enabled?: boolean;
  // Per-relay enabled state for custom profiles (key = relay url)
  relayEnabled?: Record<string, boolean>;
}

export interface RelayManagerState {
  profiles: RelayProfile[];
  activeProfileId: string;
}

type Listener = () => void;

const STORAGE_KEY = 'oni_relay_profiles';

const DEFAULT_PROFILES: RelayProfile[] = [
  { id: 'outbox', name: 'Outbox', relays: [], builtin: true, enabled: true, relayEnabled: {} },
  { id: 'inbox', name: 'Inbox', relays: [], builtin: true, enabled: true, relayEnabled: {} },
  { id: 'indexers', name: 'Indexers', relays: [], builtin: true, enabled: true, relayEnabled: {} },
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
        merged.push(saved_profile
        ? { ...saved_profile, builtin: true, enabled: saved_profile.enabled !== false, relayEnabled: saved_profile.relayEnabled || {} }
        : { ...def });
      }
      for (const p of saved.profiles) {
        if (!builtinIds.has(p.id)) {
          merged.push({ ...p, builtin: false, enabled: p.enabled !== false, relayEnabled: p.relayEnabled || {} });
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
    profiles: [...state.profiles, { id, name, relays: [], builtin: false, enabled: true, relayEnabled: {} }],
  };
  persist();
  notify();
  return id;
}

export function toggleProfileEnabled(profileId: string) {
  state = {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId ? { ...p, enabled: !p.enabled } : p,
    ),
  };
  persist();
  notify();
}

export function setRelayEnabled(profileId: string, url: string, enabled: boolean) {
  state = {
    ...state,
    profiles: state.profiles.map((p) => {
      if (p.id !== profileId) return p;
      const relayEnabled = { ...(p.relayEnabled || {}) };
      relayEnabled[url] = enabled;
      return { ...p, relayEnabled };
    }),
  };
  persist();
  notify();
}

export function isRelayEnabled(profile: RelayProfile, url: string): boolean {
  if (!profile.relayEnabled) return true;
  return profile.relayEnabled[url] !== false;
}

export function getEnabledRelayCount(profile: RelayProfile): number {
  if (!profile.enabled) return 0;
  return profile.relays.filter((url) => isRelayEnabled(profile, url)).length;
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
