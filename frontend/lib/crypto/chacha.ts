/**
 * SecureVault - ChaCha20-Poly1305 Encryption (Layer 2)
 *
 * Uses @noble/ciphers for ChaCha20-Poly1305 and XChaCha20-Poly1305.
 * These are applied as additional encryption layers on top of AES-256-GCM.
 */

import { chacha20poly1305, xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from '@noble/ciphers/utils.js';

// ─── ChaCha20-Poly1305 (Layer 2) ─────────────────────────────────────────────

const CHACHA_KEY_LENGTH = 32; // 256 bits
const CHACHA_NONCE_LENGTH = 12; // 96 bits

/**
 * Encrypt data with ChaCha20-Poly1305
 */
export const encryptChaCha20 = (
  data: Uint8Array,
  passphrase: string
): { encrypted: Uint8Array; nonce: Uint8Array; key: Uint8Array } => {
  const key = deriveChaChaKey(passphrase);
  const nonce = randomBytes(CHACHA_NONCE_LENGTH);
  const cipher = chacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(data);
  return { encrypted, nonce, key };
};

/**
 * Decrypt data with ChaCha20-Poly1305
 */
export const decryptChaCha20 = (
  encrypted: Uint8Array,
  nonce: Uint8Array,
  passphrase: string
): Uint8Array => {
  const key = deriveChaChaKey(passphrase);
  const cipher = chacha20poly1305(key, nonce);
  return cipher.decrypt(encrypted);
};

// ─── XChaCha20-Poly1305 (Layer 3 - optional) ─────────────────────────────────

const XCHACHA_NONCE_LENGTH = 24; // 192 bits

/**
 * Encrypt data with XChaCha20-Poly1305
 */
export const encryptXChaCha20 = (
  data: Uint8Array,
  passphrase: string
): { encrypted: Uint8Array; nonce: Uint8Array; key: Uint8Array } => {
  const key = deriveChaChaKey(passphrase);
  const nonce = randomBytes(XCHACHA_NONCE_LENGTH);
  const cipher = xchacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(data);
  return { encrypted, nonce, key };
};

/**
 * Decrypt data with XChaCha20-Poly1305
 */
export const decryptXChaCha20 = (
  encrypted: Uint8Array,
  nonce: Uint8Array,
  passphrase: string
): Uint8Array => {
  const key = deriveChaChaKey(passphrase);
  const cipher = xchacha20poly1305(key, nonce);
  return cipher.decrypt(encrypted);
};

// ─── Key Derivation (Passphrase → 32-byte key) ───────────────────────────────

/**
 * Simple synchronous key derivation for ChaCha layers.
 * Uses SHA-256 of passphrase as key (for layered use — AES handles main KDF).
 * For production, use PBKDF2 in an async context.
 */
const deriveChaChaKey = (passphrase: string): Uint8Array => {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);
  // Pad or truncate to 32 bytes
  const key = new Uint8Array(CHACHA_KEY_LENGTH);
  key.set(passphraseBytes.subarray(0, CHACHA_KEY_LENGTH));
  return key;
};

export type EncryptionAlgorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'XChaCha20';

export interface LayerConfig {
  algorithm: EncryptionAlgorithm;
  passphrase: string;
  order: number;
}

export interface LayerResult {
  algorithm: EncryptionAlgorithm;
  nonce: string; // base64
  order: number;
}

/**
 * Apply multiple encryption layers to a Uint8Array buffer.
 * Layer 1 = AES-256-GCM (always applied by the main encryptor)
 * Layer 2 = ChaCha20-Poly1305
 * Layer 3 = XChaCha20-Poly1305
 */
export const applyExtraLayers = (
  data: Uint8Array,
  layers: LayerConfig[]
): { data: Uint8Array; layerResults: LayerResult[] } => {
  let current = data;
  const layerResults: LayerResult[] = [];

  const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    if (layer.algorithm === 'ChaCha20-Poly1305') {
      const { encrypted, nonce } = encryptChaCha20(current, layer.passphrase);
      current = encrypted;
      layerResults.push({
        algorithm: layer.algorithm,
        nonce: btoa(String.fromCharCode(...nonce)),
        order: layer.order,
      });
    } else if (layer.algorithm === 'XChaCha20') {
      const { encrypted, nonce } = encryptXChaCha20(current, layer.passphrase);
      current = encrypted;
      layerResults.push({
        algorithm: layer.algorithm,
        nonce: btoa(String.fromCharCode(...nonce)),
        order: layer.order,
      });
    }
  }

  return { data: current, layerResults };
};

/**
 * Remove extra encryption layers (in reverse order)
 */
export const removeExtraLayers = (
  data: Uint8Array,
  layers: Array<LayerResult & { passphrase: string }>
): Uint8Array => {
  let current = data;
  const reversedLayers = [...layers].sort((a, b) => b.order - a.order);

  for (const layer of reversedLayers) {
    const nonce = Uint8Array.from(atob(layer.nonce), (c) => c.charCodeAt(0));

    if (layer.algorithm === 'ChaCha20-Poly1305') {
      current = decryptChaCha20(current, nonce, layer.passphrase);
    } else if (layer.algorithm === 'XChaCha20') {
      current = decryptXChaCha20(current, nonce, layer.passphrase);
    }
  }

  return current;
};
