// Nostr utilities for NIP-07 login and profile fetching
import { EventStore } from 'applesauce-core';
import { createAddressLoader } from 'applesauce-loaders/loaders';
import { RelayPool } from 'applesauce-relay';
import { ProfilePointer } from 'nostr-tools/nip19';
import { getDisplayName, getProfilePicture, ProfileContent } from 'applesauce-core/helpers';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

// Default relays for fetching user metadata
const DEFAULT_RELAYS = [
  'wss://purplepag.es',
  'wss://indexer.coracle.social',
  'wss://user.kindpag.es',
];

// Initialize Nostr services (singleton pattern)
let eventStore: EventStore | null = null;
let relayPool: RelayPool | null = null;
let addressLoader: ReturnType<typeof createAddressLoader> | null = null;

function getNostrServices() {
  if (!eventStore) {
    eventStore = new EventStore();
    relayPool = new RelayPool();

    addressLoader = createAddressLoader(relayPool, {
      eventStore,
      lookupRelays: DEFAULT_RELAYS,
    });

    eventStore.addressableLoader = addressLoader;
    eventStore.replaceableLoader = addressLoader;
  }

  return { eventStore, relayPool, addressLoader };
}

// NIP-07: Get public key from browser extension
export async function getNostrPublicKey(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.nostr) {
    return null;
  }

  try {
    const publicKey = await window.nostr.getPublicKey();
    return publicKey;
  } catch (error) {
    console.error('Error getting Nostr public key:', error);
    return null;
  }
}

// Check if Nostr extension is available
export function isNostrExtensionAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!window.nostr;
}

// NIP-98: Create authorization event for HTTP auth
// Returns both the base64 auth string and the pubkey from the signed event
export async function createNostrAuthEvent(
  url: string,
  method: string,
  body?: string,
): Promise<{ authString: string; pubkey: string } | null> {
  if (typeof window === 'undefined' || !window.nostr) {
    return null;
  }

  try {
    // Create the event
    const tags: string[][] = [
      ['u', url],
      ['method', method],
    ];

    // Include payload hash if body exists
    if (body) {
      const encoder = new TextEncoder();
      const data = encoder.encode(body);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      tags.push(['payload', hashHex]);
    }

    const event = {
      created_at: Math.floor(Date.now() / 1000),
      kind: 27235,
      tags,
      content: '',
    };

    // Sign the event - this will use whatever account is currently active in the extension
    const signedEvent = await window.nostr.signEvent(event);
    
    if (!signedEvent || !signedEvent.pubkey) {
      return null;
    }

    // Return both the base64 encoded event for Authorization header AND the pubkey from the signed event
    const eventJson = JSON.stringify(signedEvent);
    return {
      authString: btoa(eventJson),
      pubkey: signedEvent.pubkey,
    };
  } catch (error) {
    console.error('Error creating Nostr auth event:', error);
    return null;
  }
}

// Fetch user profile from Nostr relays
export async function fetchNostrProfile(
  pubkey: string,
  relays?: string[],
): Promise<ProfileContent | undefined> {
  try {
    const { eventStore } = getNostrServices();
    const profilePointer: ProfilePointer = {
      pubkey,
      relays: relays || DEFAULT_RELAYS,
    };

    // Get the first value from the profile observable with a timeout
    const profile = await firstValueFrom(
      eventStore.profile(profilePointer).pipe(timeout(10000)),
    );

    return profile || undefined;
  } catch (error) {
    console.error('Error fetching Nostr profile:', error);
    return undefined;
  }
}

// Get display name from profile with fallback
export function getNostrDisplayName(profile: ProfileContent | undefined, pubkey: string): string {
  if (!profile) {
    return pubkey.slice(0, 8);
  }
  return getDisplayName(profile, pubkey.slice(0, 8));
}

// Get profile picture from profile with fallback
export function getNostrProfilePicture(profile: ProfileContent | undefined, pubkey: string): string | undefined {
  if (!profile) {
    return undefined;
  }
  return getProfilePicture(profile, undefined);
}

// Store Nostr pubkey in localStorage
export function storeNostrPubkey(pubkey: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem('nostrPubkey', pubkey);
}

// Get stored Nostr pubkey from localStorage
export function getStoredNostrPubkey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('nostrPubkey');
}

// Clear stored Nostr pubkey
export function clearStoredNostrPubkey(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('nostrPubkey');
}

// Type declaration for window.nostr
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: {
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
      }): Promise<{
        id: string;
        pubkey: string;
        created_at: number;
        kind: number;
        tags: string[][];
        content: string;
        sig: string;
      }>;
    };
  }
}

