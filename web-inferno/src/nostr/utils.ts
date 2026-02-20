import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { bech32 } from '@scure/base';

export { bytesToHex, hexToBytes };

const BECH32_MAX_LENGTH = 5000;

export function utf8Encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

// NIP-19 bech32 encoding
export function encodeBech32(prefix: string, hex: string): string {
  const data = hexToBytes(hex);
  const words = bech32.toWords(data);
  return bech32.encode(prefix, words, BECH32_MAX_LENGTH);
}

export function decodeBech32(str: string): { prefix: string; hex: string } {
  const { prefix, words } = bech32.decode(str, BECH32_MAX_LENGTH);
  const data = bech32.fromWords(words);
  return { prefix, hex: bytesToHex(new Uint8Array(data)) };
}

export function npubEncode(hex: string): string {
  return encodeBech32('npub', hex);
}

export function nsecEncode(hex: string): string {
  return encodeBech32('nsec', hex);
}

export function noteEncode(hex: string): string {
  return encodeBech32('note', hex);
}

export function npubDecode(npub: string): string {
  const { prefix, hex } = decodeBech32(npub);
  if (prefix !== 'npub') throw new Error(`Expected npub, got ${prefix}`);
  return hex;
}

export function nsecDecode(nsec: string): string {
  const { prefix, hex } = decodeBech32(nsec);
  if (prefix !== 'nsec') throw new Error(`Expected nsec, got ${prefix}`);
  return hex;
}

export function noteDecode(note: string): string {
  const { prefix, hex } = decodeBech32(note);
  if (prefix !== 'note') throw new Error(`Expected note, got ${prefix}`);
  return hex;
}

// NIP-19 TLV encoding for nprofile
export function nprofileEncode(pubkey: string, relays: string[] = []): string {
  const buf: number[] = [];
  // TLV type 0x00 = special (pubkey, 32 bytes)
  const pkBytes = hexToBytes(pubkey);
  buf.push(0x00, 0x20, ...pkBytes);
  // TLV type 0x01 = relay URL
  for (const relay of relays) {
    const relayBytes = new TextEncoder().encode(relay);
    buf.push(0x01, relayBytes.length, ...relayBytes);
  }
  const words = bech32.toWords(new Uint8Array(buf));
  return bech32.encode('nprofile', words, BECH32_MAX_LENGTH);
}

// NIP-19 TLV decoding for nprofile
export function nprofileDecode(nprofile: string): { pubkey: string; relays: string[] } {
  const { prefix, words } = bech32.decode(nprofile, BECH32_MAX_LENGTH);
  if (prefix !== 'nprofile') throw new Error(`Expected nprofile, got ${prefix}`);
  const data = new Uint8Array(bech32.fromWords(words));
  let pubkey = '';
  const relays: string[] = [];
  let i = 0;
  while (i < data.length) {
    const type = data[i];
    const len = data[i + 1];
    const value = data.slice(i + 2, i + 2 + len);
    if (type === 0x00) pubkey = bytesToHex(value);
    else if (type === 0x01) relays.push(new TextDecoder().decode(value));
    i += 2 + len;
  }
  return { pubkey, relays };
}

// Kind number to human-readable name
export function kindName(kind: number): string {
  const names: Record<number, string> = {
    0: 'Metadata',
    1: 'Short Text Note',
    2: 'Recommend Relay',
    3: 'Contacts',
    4: 'Encrypted DM',
    5: 'Event Deletion',
    6: 'Repost',
    7: 'Reaction',
    8: 'Badge Award',
    16: 'Generic Repost',
    40: 'Channel Creation',
    41: 'Channel Metadata',
    42: 'Channel Message',
    43: 'Channel Hide Message',
    44: 'Channel Mute User',
    1063: 'File Metadata',
    1111: 'Comment',
    1984: 'Reporting',
    9734: 'Zap Request',
    9735: 'Zap',
    10000: 'Mute List',
    10001: 'Pin List',
    10002: 'Relay List Metadata',
    30000: 'Categorized People',
    30001: 'Categorized Bookmarks',
    30009: 'Badge Definition',
    30023: 'Long-form Content',
    30078: 'Application-specific Data',
    30311: 'Live Event',
  };
  return names[kind] || `Kind ${kind}`;
}

// Validate 64-char lowercase hex
export function isHex(str: string, length: number = 64): boolean {
  const re = new RegExp(`^[0-9a-f]{${length}}$`);
  return re.test(str);
}

// Truncate hex for display: abcdef...123456
export function shortenHex(hex: string, chars: number = 8): string {
  if (hex.length <= chars * 2) return hex;
  return `${hex.slice(0, chars)}...${hex.slice(-chars)}`;
}

// Truncate npub for display
export function shortenNpub(npub: string): string {
  if (npub.length <= 20) return npub;
  return `${npub.slice(0, 12)}...${npub.slice(-6)}`;
}
