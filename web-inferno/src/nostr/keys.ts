import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';
import { npubEncode, nsecEncode } from './utils';

export interface KeyPair {
  privateKey: string; // 64-char hex
  publicKey: string;  // 64-char hex
}

export function generateKeyPair(): KeyPair {
  const privateKeyBytes = schnorr.utils.randomPrivateKey();
  const privateKey = bytesToHex(privateKeyBytes);
  const publicKey = bytesToHex(schnorr.getPublicKey(privateKeyBytes));
  return { privateKey, publicKey };
}

export function getPublicKey(privateKeyHex: string): string {
  return bytesToHex(schnorr.getPublicKey(privateKeyHex));
}

export function keyPairToNip19(kp: KeyPair): { npub: string; nsec: string } {
  return {
    npub: npubEncode(kp.publicKey),
    nsec: nsecEncode(kp.privateKey),
  };
}
