/**
 * SecureVault Client-Side Encryption Library
 *
 * AES-256-GCM encryption/decryption using the Web Crypto API.
 * The server NEVER receives plaintext files or keys.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

// ─── Key Generation ──────────────────────────────────────────────────────────

/**
 * Generate a new random AES-256-GCM key
 */
export const generateAESKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ['encrypt', 'decrypt']
  );
};

/**
 * Export an AES key to raw bytes
 */
export const exportAESKey = async (key: CryptoKey): Promise<ArrayBuffer> => {
  return crypto.subtle.exportKey('raw', key);
};

/**
 * Import raw AES key bytes back to a CryptoKey
 */
export const importAESKey = async (rawKey: ArrayBuffer): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable after import (security)
    ['encrypt', 'decrypt']
  );
};

// ─── Encrypt ────────────────────────────────────────────────────────────────

export interface AESEncryptResult {
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  key: CryptoKey;
  /** Present only when the key is extractable (e.g. randomly generated). */
  rawKey?: ArrayBuffer;
}

/**
 * Encrypt a file buffer with AES-256-GCM.
 * Returns encrypted data, IV, and the raw key (to be wrapped with RSA).
 */
export const encryptFileAES = async (
  fileBuffer: ArrayBuffer,
  existingKey?: CryptoKey
): Promise<AESEncryptResult> => {
  const key = existingKey || (await generateAESKey());
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedData = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    fileBuffer
  );

  // PBKDF2-derived keys are non-extractable; only export randomly generated keys.
  const rawKey = existingKey ? undefined : await exportAESKey(key);

  return { encryptedData, iv, key, rawKey };
};

// ─── Decrypt ────────────────────────────────────────────────────────────────

/**
 * Decrypt an AES-256-GCM encrypted buffer.
 */
export const decryptFileAES = async (
  encryptedBuffer: ArrayBuffer,
  rawKeyOrCryptoKey: ArrayBuffer | CryptoKey,
  iv: Uint8Array | ArrayBuffer
): Promise<ArrayBuffer> => {
  const key =
    rawKeyOrCryptoKey instanceof CryptoKey
      ? rawKeyOrCryptoKey
      : await importAESKey(rawKeyOrCryptoKey);

  return crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv instanceof ArrayBuffer ? new Uint8Array(iv) : new Uint8Array(iv),
    },
    key,
    encryptedBuffer
  );
};

// ─── Passphrase-based Key Derivation ────────────────────────────────────────

/**
 * Derive an AES key from a passphrase using PBKDF2
 */
export const deriveKeyFromPassphrase = async (
  passphrase: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> => {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const usedSalt = salt || crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(usedSalt),
      iterations: 310000, // OWASP recommended
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt: usedSalt };
};

// ─── Utility ─────────────────────────────────────────────────────────────────

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const uint8ArrayToBase64 = (arr: Uint8Array): string => {
  return arrayBufferToBase64(toArrayBuffer(arr));
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  return new Uint8Array(base64ToArrayBuffer(base64));
};
