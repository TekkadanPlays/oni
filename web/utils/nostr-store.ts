// Nostr-related atoms for global state management
import { atom } from 'recoil';
import { ProfileContent } from 'applesauce-core/helpers';

export interface NostrProfile {
  pubkey: string;
  profile?: ProfileContent;
  displayName?: string;
  picture?: string;
}

// Atom for storing Nostr profile data
export const nostrProfileAtom = atom<NostrProfile | null>({
  key: 'nostrProfileAtom',
  default: null,
});

// Atom for storing admin/streamer Nostr profile (used in Social config)
export const nostrStreamerProfileAtom = atom<NostrProfile | null>({
  key: 'nostrStreamerProfileAtom',
  default: null,
});

