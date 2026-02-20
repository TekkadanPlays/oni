import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { signEvent, verifySignature } from './sign';
import { unixNow, utf8Encode } from './utils';

export type NostrTag = string[];

export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: NostrTag[];
  content: string;
}

export interface NostrEvent extends UnsignedEvent {
  id: string;
  sig: string;
}

// Serialize event for hashing per NIP-01
export function serializeEvent(evt: UnsignedEvent): string {
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content,
  ]);
}

// Compute event ID (sha256 of serialized event)
export function computeEventId(evt: UnsignedEvent): string {
  const serialized = serializeEvent(evt);
  const hash = sha256(utf8Encode(serialized));
  return bytesToHex(hash);
}

// Create an unsigned event template
export function createEvent(
  kind: number,
  content: string,
  tags: NostrTag[] = [],
  pubkey: string = '',
): UnsignedEvent {
  return {
    pubkey,
    created_at: unixNow(),
    kind,
    tags,
    content,
  };
}

// Sign an event with a private key (for non-NIP-07 usage)
export function finalizeEvent(evt: UnsignedEvent, privateKeyHex: string): NostrEvent {
  const id = computeEventId(evt);
  const sig = signEvent(id, privateKeyHex);
  return { ...evt, id, sig };
}

// Validate an event's ID and signature
export function validateEvent(evt: NostrEvent): boolean {
  const expectedId = computeEventId(evt);
  if (evt.id !== expectedId) return false;
  return verifySignature(evt.id, evt.sig, evt.pubkey);
}

// Common event kinds
export const Kind = {
  Metadata: 0,
  Text: 1,
  RecommendRelay: 2,
  Contacts: 3,
  EncryptedDM: 4,
  EventDeletion: 5,
  Repost: 6,
  Reaction: 7,
  ChannelCreation: 40,
  ChannelMetadata: 41,
  ChannelMessage: 42,
  ChannelHideMessage: 43,
  ChannelMuteUser: 44,
  Comment: 1111,
  // NIP-42 client authentication
  ClientAuth: 22242,
  // NIP-65 relay list metadata
  RelayList: 10002,
  // NIP-53 live events
  LiveEvent: 30311,
} as const;
