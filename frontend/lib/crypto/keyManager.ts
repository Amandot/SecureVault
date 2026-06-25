/**
 * SecureVault - RSA-OAEP Key Manager
 *
 * Generates RSA-4096 key pairs for wrapping/unwrapping AES keys.
 * The private key is stored encrypted in localStorage using a passphrase.
 * The public key is stored on the server for key wrapping during sharing.
 */

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]), // 65537
  hash: 'SHA-256',
};

// ─── Key Pair Generation ─────────────────────────────────────────────────────

/**
 * Generate a new RSA-4096 key pair
 */
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return crypto.subtle.generateKey(RSA_ALGORITHM, true, ['wrapKey', 'unwrapKey']);
};

/**
 * Export RSA public key to JWK string (sent to server)
 */
export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
};

/**
 * Export RSA private key to PKCS8 ArrayBuffer (stored locally, encrypted)
 */
export const exportPrivateKey = async (privateKey: CryptoKey): Promise<ArrayBuffer> => {
  return crypto.subtle.exportKey('pkcs8', privateKey);
};

/**
 * Import RSA public key from JWK string
 */
export const importPublicKey = async (jwkString: string): Promise<CryptoKey> => {
  const jwk = JSON.parse(jwkString);
  return crypto.subtle.importKey('jwk', jwk, RSA_ALGORITHM, false, ['wrapKey']);
};

/**
 * Import RSA private key from PKCS8 ArrayBuffer
 */
export const importPrivateKey = async (pkcs8: ArrayBuffer): Promise<CryptoKey> => {
  return crypto.subtle.importKey('pkcs8', pkcs8, RSA_ALGORITHM, false, ['unwrapKey']);
};

// ─── Key Wrapping (RSA-OAEP over AES key) ───────────────────────────────────

/**
 * Wrap (encrypt) an AES key using an RSA public key.
 * Returns base64-encoded wrapped key to be stored in DB / sent to recipient.
 */
export const wrapAESKey = async (
  aesKey: CryptoKey,
  rsaPublicKey: CryptoKey
): Promise<string> => {
  const wrappedKey = await crypto.subtle.wrapKey('raw', aesKey, rsaPublicKey, {
    name: 'RSA-OAEP',
  });
  return btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
};

/**
 * Unwrap (decrypt) an AES key using an RSA private key.
 */
export const unwrapAESKey = async (
  wrappedKeyBase64: string,
  rsaPrivateKey: CryptoKey
): Promise<CryptoKey> => {
  const wrappedKeyBytes = Uint8Array.from(atob(wrappedKeyBase64), (c) =>
    c.charCodeAt(0)
  );

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBytes,
    rsaPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );
};

// ─── Local Storage (Encrypted Private Key) ──────────────────────────────────

const PRIVATE_KEY_STORAGE_KEY = 'sv_private_key';

/**
 * Store the private key encrypted in localStorage.
 * Encrypted with AES-GCM derived from user passphrase.
 */
export const storePrivateKey = async (
  privateKeyBuffer: ArrayBuffer,
  passphrase: string
): Promise<void> => {
  const { deriveKeyFromPassphrase, encryptFileAES, arrayBufferToBase64, uint8ArrayToBase64 } =
    await import('./aes');

  const { key, salt } = await deriveKeyFromPassphrase(passphrase);
  const { encryptedData, iv } = await encryptFileAES(privateKeyBuffer, key);

  const stored = {
    encryptedKey: arrayBufferToBase64(encryptedData),
    iv: uint8ArrayToBase64(iv),
    salt: arrayBufferToBase64(
      salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer
    ),
  };

  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(stored));
};

/**
 * Load and decrypt the private key from localStorage.
 */
export const loadPrivateKey = async (passphrase: string): Promise<CryptoKey | null> => {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return null;

  const { encryptedKey, iv, salt } = JSON.parse(stored);

  const { deriveKeyFromPassphrase, decryptFileAES, base64ToArrayBuffer, base64ToUint8Array } =
    await import('./aes');

  const { key } = await deriveKeyFromPassphrase(
    passphrase,
    base64ToUint8Array(salt)
  );

  const decryptedPrivateKeyBuffer = await decryptFileAES(
    base64ToArrayBuffer(encryptedKey),
    key,
    base64ToUint8Array(iv)
  );

  return importPrivateKey(decryptedPrivateKeyBuffer);
};

/**
 * Check if a private key exists in localStorage
 */
export const hasStoredPrivateKey = (): boolean => {
  return !!localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
};

/**
 * Clear stored private key (on logout)
 */
export const clearPrivateKey = (): void => {
  localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
};
