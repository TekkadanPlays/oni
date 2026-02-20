import type { UnsignedEvent, NostrEvent } from './event';
import { computeEventId } from './event';

// NIP-07: window.nostr capability for web browsers
// Extensions like Alby, nos2x, etc. inject window.nostr

export interface Nip07Nostr {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedEvent & { id: string }): Promise<NostrEvent>;
  getRelays?(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

declare global {
  interface Window {
    nostr?: Nip07Nostr;
  }
}

export function hasNip07(): boolean {
  return typeof window !== 'undefined' && !!window.nostr;
}

export async function getNip07PublicKey(): Promise<string> {
  if (!hasNip07()) throw new Error('No NIP-07 extension found. Install Alby or nos2x.');
  return window.nostr!.getPublicKey();
}

export async function signWithExtension(event: UnsignedEvent): Promise<NostrEvent> {
  if (!hasNip07()) throw new Error('No NIP-07 extension found.');
  const id = computeEventId(event);
  const eventWithId = { ...event, id };
  return window.nostr!.signEvent(eventWithId);
}

export async function getExtensionRelays(): Promise<Record<string, { read: boolean; write: boolean }> | null> {
  if (!hasNip07() || !window.nostr!.getRelays) return null;
  try {
    return await window.nostr!.getRelays!();
  } catch {
    return null;
  }
}
