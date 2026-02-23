// NIP-53 Live Event Configuration Store
// Persists user-configured metadata for live events to localStorage.
// Used by the NostrLiveTab and consumed by liveevents.ts when broadcasting.

type Listener = () => void;

export interface LiveParticipant {
  pubkey: string;
  relay?: string;
  role: string;
}

export interface LiveConfig {
  title: string;
  summary: string;
  image: string;
  tags: string[];
  participants: LiveParticipant[];
  // Future: recording URL, goal amount, etc.
}

const STORAGE_KEY = 'oni_live_config';

const DEFAULT_CONFIG: LiveConfig = {
  title: '',
  summary: '',
  image: '',
  tags: [],
  participants: [],
};

let state: LiveConfig = { ...DEFAULT_CONFIG };
const listeners: Set<Listener> = new Set();

function notify() {
  for (const fn of listeners) fn();
}

function persist() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadLiveConfig() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...DEFAULT_CONFIG, ...parsed };
      notify();
    }
  } catch { /* ignore */ }
}

export function getLiveConfig(): LiveConfig {
  return state;
}

export function subscribeLiveConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateLiveConfig(updates: Partial<LiveConfig>) {
  state = { ...state, ...updates };
  persist();
  notify();
}

export function addTag(tag: string) {
  const trimmed = tag.trim().toLowerCase();
  if (!trimmed || state.tags.includes(trimmed)) return;
  state = { ...state, tags: [...state.tags, trimmed] };
  persist();
  notify();
}

export function removeTag(tag: string) {
  state = { ...state, tags: state.tags.filter((t) => t !== tag) };
  persist();
  notify();
}

export function addParticipant(participant: LiveParticipant) {
  if (state.participants.some((p) => p.pubkey === participant.pubkey)) return;
  state = { ...state, participants: [...state.participants, participant] };
  persist();
  notify();
}

export function removeParticipant(pubkey: string) {
  state = { ...state, participants: state.participants.filter((p) => p.pubkey !== pubkey) };
  persist();
  notify();
}

export function updateParticipant(pubkey: string, updates: Partial<LiveParticipant>) {
  state = {
    ...state,
    participants: state.participants.map((p) =>
      p.pubkey === pubkey ? { ...p, ...updates } : p
    ),
  };
  persist();
  notify();
}

export function resetLiveConfig() {
  state = { ...DEFAULT_CONFIG };
  persist();
  notify();
}
