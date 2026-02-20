import { schnorr } from '@noble/curves/secp256k1';
import { bytesToHex } from '@noble/hashes/utils';

export function signEvent(eventHash: string, privateKeyHex: string): string {
  const sig = schnorr.sign(eventHash, privateKeyHex);
  return bytesToHex(sig);
}

export function verifySignature(eventHash: string, signature: string, publicKeyHex: string): boolean {
  try {
    return schnorr.verify(signature, eventHash, publicKeyHex);
  } catch {
    return false;
  }
}
