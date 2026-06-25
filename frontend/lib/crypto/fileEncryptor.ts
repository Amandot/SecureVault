/**
 * SecureVault - High-Level File Encryptor/Decryptor
 *
 * Orchestrates the full encrypt/decrypt pipeline:
 * 1. AES-256-GCM (Layer 1, always)
 * 2. ChaCha20-Poly1305 (Layer 2, optional)
 * 3. XChaCha20 (Layer 3, optional)
 * 4. RSA key wrapping for storage/sharing
 */

import {
  encryptFileAES,
  decryptFileAES,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from './aes';
import { applyExtraLayers, removeExtraLayers, LayerConfig, LayerResult } from './chacha';
import { wrapAESKey, unwrapAESKey } from './keyManager';

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export interface EncryptionOptions {
  rsaPublicKey: CryptoKey; // owner's public key
  extraLayers?: LayerConfig[]; // ChaCha20 / XChaCha20 layers
}

export interface EncryptedFilePackage {
  encryptedBlob: Blob;           // what gets uploaded to S3
  encryptedKey: string;          // RSA-wrapped AES key (base64), stored in DB
  iv: string;                    // AES IV (base64)
  encryptionType: string;        // human-readable algo string
  layerCount: number;
  layers: LayerResult[];         // ChaCha20/XChaCha20 layer metadata
}

export interface DecryptionOptions {
  encryptedKeyBase64: string;    // RSA-wrapped AES key from DB
  ivBase64: string;              // AES IV from DB
  rsaPrivateKey: CryptoKey;      // owner/recipient's private key
  layers?: Array<LayerResult & { passphrase: string }>; // extra layers in reverse order
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────

/**
 * Full encryption pipeline:
 * File → [XChaCha20?] → [ChaCha20?] → AES-256-GCM → RSA key wrap
 */
export const encryptFile = async (
  file: File,
  options: EncryptionOptions
): Promise<EncryptedFilePackage> => {
  // Read file to ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  let dataToEncrypt = new Uint8Array(fileBuffer);

  // Apply extra layers first (outer to inner, in REVERSE order of application)
  // So outer = applied last = decrypted first
  const layerResults: LayerResult[] = [];

  if (options.extraLayers && options.extraLayers.length > 0) {
    const { data, layerResults: results } = applyExtraLayers(
      dataToEncrypt,
      options.extraLayers
    );
    dataToEncrypt = new Uint8Array(data);
    layerResults.push(...results);
  }

  // Apply AES-256-GCM as the innermost layer
  const { encryptedData, iv, key } = await encryptFileAES(dataToEncrypt.buffer);

  // Wrap the AES key with owner's RSA public key
  const encryptedKey = await wrapAESKey(key, options.rsaPublicKey);

  // Build encryption type string
  const algorithms = ['AES-256-GCM'];
  if (options.extraLayers) {
    options.extraLayers
      .sort((a, b) => a.order - b.order)
      .forEach((l) => algorithms.push(l.algorithm));
  }
  const encryptionType = algorithms.join('+');

  return {
    encryptedBlob: new Blob([encryptedData], { type: 'application/octet-stream' }),
    encryptedKey,
    iv: uint8ArrayToBase64(iv),
    encryptionType,
    layerCount: 1 + (options.extraLayers?.length || 0),
    layers: layerResults,
  };
};

// ─── Decrypt ─────────────────────────────────────────────────────────────────

/**
 * Full decryption pipeline (reverse of encryption):
 * Download → AES-256-GCM decrypt → [ChaCha20?] → [XChaCha20?] → Plaintext
 */
export const decryptFile = async (
  encryptedBuffer: ArrayBuffer,
  options: DecryptionOptions
): Promise<ArrayBuffer> => {
  // Step 1: Unwrap the AES key using RSA private key
  const aesKey = await unwrapAESKey(options.encryptedKeyBase64, options.rsaPrivateKey);

  // Step 2: Get raw key for decryptFileAES (it needs raw bytes)
  const rawKey = await crypto.subtle.exportKey('raw', aesKey);

  // Step 3: Decrypt AES-256-GCM (innermost layer)
  const iv = base64ToUint8Array(options.ivBase64);
  let decrypted = await decryptFileAES(encryptedBuffer, rawKey, iv);

  // Step 4: Remove extra layers in reverse order (outermost first)
  if (options.layers && options.layers.length > 0) {
    const sortedLayers = [...options.layers].sort((a, b) => b.order - a.order);
    const decryptedLayers = removeExtraLayers(new Uint8Array(decrypted), sortedLayers);
    decrypted = toArrayBuffer(decryptedLayers);
  }

  return decrypted;
};



// ─── Download ────────────────────────────────────────────────────────────────

/**
 * Download an encrypted file from a signed URL.
 */
export const downloadEncryptedFile = async (
  signedUrl: string
): Promise<ArrayBuffer> => {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
};

// ─── Strength Indicator ───────────────────────────────────────────────────────

export interface StrengthResult {
  score: number; // 0–100
  label: string;
  color: string;
}

export const getPassphraseStrength = (passphrase: string): StrengthResult => {
  let score = 0;
  if (passphrase.length >= 8) score += 20;
  if (passphrase.length >= 16) score += 20;
  if (/[A-Z]/.test(passphrase)) score += 15;
  if (/[a-z]/.test(passphrase)) score += 15;
  if (/[0-9]/.test(passphrase)) score += 15;
  if (/[^A-Za-z0-9]/.test(passphrase)) score += 15;

  if (score >= 80) return { score, label: 'Strong', color: '#00E39B' };
  if (score >= 50) return { score, label: 'Medium', color: '#F59E0B' };
  return { score, label: 'Weak', color: '#EF4444' };
};
