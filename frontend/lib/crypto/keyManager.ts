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

export const verifyKeyPair = async (
  publicKey: CryptoKey,
  privateKey: CryptoKey
): Promise<boolean> => {
  try {
    // Generate a temporary AES key to test wrapping and unwrapping
    const testAes = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    // Wrap it using the public key
    const wrapped = await crypto.subtle.wrapKey('raw', testAes, publicKey, {
      name: 'RSA-OAEP',
    });
    // Unwrap it using the private key
    await crypto.subtle.unwrapKey(
      'raw',
      wrapped,
      privateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    return true;
  } catch (e) {
    return false;
  }
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
  const { arrayBufferToBase64 } = await import('./aes');
  const wrappedKey = await crypto.subtle.wrapKey('raw', aesKey, rsaPublicKey, {
    name: 'RSA-OAEP',
  });
  return arrayBufferToBase64(wrappedKey);
};

/**
 * Unwrap (decrypt) an AES key using an RSA private key.
 */
export const unwrapAESKey = async (
  wrappedKeyBase64: string,
  rsaPrivateKey: CryptoKey
): Promise<CryptoKey> => {
  const { base64ToUint8Array } = await import('./aes');
  const wrappedKeyBytes = base64ToUint8Array(wrappedKeyBase64);
  const wrappedKeyBuffer = wrappedKeyBytes.buffer.slice(
    wrappedKeyBytes.byteOffset,
    wrappedKeyBytes.byteOffset + wrappedKeyBytes.byteLength
  ) as ArrayBuffer;

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKeyBuffer,
    rsaPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,        // extractable — needed so we can re-wrap for a recipient
    ['encrypt', 'decrypt']
  );
};

/**
 * Re-wrap an AES key for a recipient:
 * 1. Unwrap the owner's copy using the owner's RSA private key
 * 2. Export the raw AES key bytes
 * 3. Wrap those bytes with the recipient's RSA public key
 *
 * Returns the base64-encoded wrapped key to store as encryptedKeyForRecipient.
 */
export const rewrapAESKeyForRecipient = async (
  ownerWrappedKeyBase64: string,
  ownerPrivateKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> => {
  // Unwrap to get the raw AES key
  const aesKey = await unwrapAESKey(ownerWrappedKeyBase64, ownerPrivateKey);

  // Wrap the AES key with recipient's RSA public key
  const wrappedForRecipient = await crypto.subtle.wrapKey(
    'raw',
    aesKey,
    recipientPublicKey,
    { name: 'RSA-OAEP' }
  );

  const { arrayBufferToBase64 } = await import('./aes');
  return arrayBufferToBase64(wrappedForRecipient);
};

// ─── Local Storage (Encrypted Private Key) ──────────────────────────────────

const PRIVATE_KEY_STORAGE_KEY = 'sv_private_key';

/** Shape of what we persist in localStorage and export as a backup file */
export interface StoredKeyBundle {
  encryptedKey: string; // base64 AES-GCM ciphertext of the PKCS8 private key
  iv: string;           // base64 AES-GCM IV (12 bytes)
  salt: string;         // base64 PBKDF2 salt (16 bytes)
  version: number;      // schema version — always 1
  /** JWK of the matching RSA public key — used for encryption without trusting server state */
  publicKeyJwk?: string;
}

/**
 * Store the private key encrypted in localStorage.
 * Encrypted with AES-GCM derived from user passphrase via PBKDF2-SHA256.
 *
 * A new random salt is generated each time storePrivateKey is called.
 * This only happens on first key-pair generation, not on subsequent uploads.
 */
export const storePrivateKey = async (
  privateKeyBuffer: ArrayBuffer,
  passphrase: string,
  publicKeyJwk?: string
): Promise<void> => {
  const { deriveKeyFromPassphrase, encryptFileAES, arrayBufferToBase64, uint8ArrayToBase64 } =
    await import('./aes');

  const { key, salt } = await deriveKeyFromPassphrase(passphrase);
  const { encryptedData, iv } = await encryptFileAES(privateKeyBuffer, key);

  const bundle: StoredKeyBundle = {
    encryptedKey: arrayBufferToBase64(encryptedData),
    iv: uint8ArrayToBase64(iv),
    salt: arrayBufferToBase64(
      salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer
    ),
    version: 1,
    ...(publicKeyJwk ? { publicKeyJwk } : {}),
  };

  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(bundle));
};

/**
 * Read the public key JWK stored alongside the encrypted private key bundle.
 */
export const getStoredPublicKeyJwk = (): string | null => {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return null;

  try {
    const bundle: StoredKeyBundle = JSON.parse(stored);
    return bundle.publicKeyJwk ?? null;
  } catch {
    return null;
  }
};

/**
 * Persist the matching public key JWK into an existing bundle (no re-encryption).
 */
export const backfillPublicKeyInBundle = (publicKeyJwk: string): void => {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return;

  try {
    const bundle: StoredKeyBundle = JSON.parse(stored);
    if (bundle.publicKeyJwk === publicKeyJwk) return;
    bundle.publicKeyJwk = publicKeyJwk;
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // ignore corrupt bundle
  }
};

export class KeyPairMismatchError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'Your local private key does not match the public key used to encrypt this file. ' +
          'Import the correct key backup from Settings → Security Keys, or regenerate your key pair ' +
          '(note: regenerating will make previously encrypted files unreadable).'
    );
    this.name = 'KeyPairMismatchError';
  }
}

/**
 * Resolve the RSA key pair to use for encryption.
 * Always prefers the locally stored public key so wrap/unwrap stay in sync.
 */
export const resolveEncryptionKeyPair = async (
  passphrase: string,
  serverPublicKeyJwk?: string | null
): Promise<{ privateKey: CryptoKey; publicKey: CryptoKey; publicKeyJwk: string }> => {
  const privateKey = await loadPrivateKey(passphrase);
  if (!privateKey) {
    throw new Error(
      'Private key could not be loaded. Restore your key backup in Settings → Security Keys.'
    );
  }

  let publicKeyJwk = getStoredPublicKeyJwk();
  if (!publicKeyJwk && serverPublicKeyJwk) {
    const serverPublicKey = await importPublicKey(serverPublicKeyJwk);
    const matches = await verifyKeyPair(serverPublicKey, privateKey);
    if (!matches) {
      throw new KeyPairMismatchError();
    }
    publicKeyJwk = serverPublicKeyJwk;
    backfillPublicKeyInBundle(publicKeyJwk);
  }

  if (!publicKeyJwk) {
    throw new Error(
      'No public key found for your private key. Go to Settings → Encryption and regenerate your key pair, ' +
        'or restore the key backup that was created when you first uploaded files.'
    );
  }

  const publicKey = await importPublicKey(publicKeyJwk);
  const matches = await verifyKeyPair(publicKey, privateKey);
  if (!matches) {
    throw new KeyPairMismatchError(
      'Your stored key pair is inconsistent. Restore your key backup from Settings → Security Keys.'
    );
  }

  return { privateKey, publicKey, publicKeyJwk };
};

/**
 * Verify that a loaded private key can unwrap files encrypted for this account.
 */
export const verifyPrivateKeyForAccount = async (
  privateKey: CryptoKey,
  serverPublicKeyJwk?: string | null
): Promise<void> => {
  const localPublicKeyJwk = getStoredPublicKeyJwk();
  const publicKeyJwk = localPublicKeyJwk ?? serverPublicKeyJwk;

  if (!publicKeyJwk) {
    throw new KeyPairMismatchError(
      'No registered public key found. Restore your key backup or regenerate your key pair in Settings.'
    );
  }

  const publicKey = await importPublicKey(publicKeyJwk);
  const matches = await verifyKeyPair(publicKey, privateKey);
  if (!matches) {
    throw new KeyPairMismatchError();
  }

  if (!localPublicKeyJwk) {
    backfillPublicKeyInBundle(publicKeyJwk);
  }
};

/**
 * Load and decrypt the private key from localStorage.
 * Returns null if no key is stored (never throws for missing key).
 * Throws if the passphrase is wrong (AES-GCM authentication fails).
 */
export const loadPrivateKey = async (passphrase: string): Promise<CryptoKey | null> => {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return null;

  let bundle: StoredKeyBundle;
  try {
    bundle = JSON.parse(stored);
  } catch {
    console.warn('[SecureVault] Private key bundle is not valid JSON — localStorage may be corrupt.');
    return null;
  }

  // Guard against corrupt / partially-written bundles
  if (!bundle.encryptedKey || !bundle.iv || !bundle.salt) {
    console.warn('[SecureVault] Private key bundle is malformed — missing fields. Re-import from backup.');
    return null;
  }

  const { deriveKeyFromPassphrase, decryptFileAES, base64ToArrayBuffer, base64ToUint8Array } =
    await import('./aes');

  // CRITICAL: always use the STORED salt, never generate a new one here.
  const { key } = await deriveKeyFromPassphrase(
    passphrase,
    base64ToUint8Array(bundle.salt)   // ← must be the same salt used during storePrivateKey
  );

  // AES-GCM authentication tag check: throws DOMException on wrong passphrase.
  // DOMException.message is always "" in Web Crypto — convert to a readable Error.
  let decryptedPrivateKeyBuffer: ArrayBuffer;
  try {
    decryptedPrivateKeyBuffer = await decryptFileAES(
      base64ToArrayBuffer(bundle.encryptedKey),
      key,
      base64ToUint8Array(bundle.iv)
    );
  } catch (err) {
    // AES-GCM failed → authentication tag mismatch → wrong passphrase
    throw new Error('Wrong master passphrase — decryption failed. Please try again.');
  }

  try {
    return await importPrivateKey(decryptedPrivateKeyBuffer);
  } catch (err) {
    throw new Error('Private key data is corrupt — please restore from your key backup file.');
  }
};


/**
 * Check if a private key bundle exists in localStorage.
 * Does NOT verify whether the passphrase is correct.
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

// ─── Key Backup / Restore ────────────────────────────────────────────────────

/**
 * Export the encrypted private key bundle as a JSON string for download.
 *
 * The bundle is already AES-GCM encrypted with the user's master passphrase.
 * Zero-knowledge is preserved — the server never sees this file.
 *
 * @returns JSON string, or null if no key is stored.
 */
export const exportEncryptedKeyBundle = (): string | null => {
  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return null;

  try {
    const bundle: StoredKeyBundle = JSON.parse(stored);
    return JSON.stringify(
      { ...bundle, app: 'SecureVault', exported: new Date().toISOString() },
      null,
      2
    );
  } catch {
    return null;
  }
};

/**
 * Trigger a browser file-download of the encrypted key backup.
 * Returns true if successful, false if no key is stored.
 */
export const downloadKeyBackup = (): boolean => {
  const json = exportEncryptedKeyBundle();
  if (!json) return false;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `securevault-key-backup-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

/**
 * Restore an encrypted key bundle from a backup file JSON string.
 *
 * Verifies that the supplied passphrase can successfully decrypt the key
 * before overwriting whatever is in localStorage. Rolls back on failure.
 *
 * @throws Error if JSON is invalid, bundle is malformed, or passphrase is wrong.
 */
export const importEncryptedKeyBundle = async (
  bundleJson: string,
  passphrase: string
): Promise<void> => {
  let parsed: any;
  try {
    parsed = JSON.parse(bundleJson);
  } catch {
    throw new Error('Invalid key backup file — could not parse JSON.');
  }

  if (!parsed.encryptedKey || !parsed.iv || !parsed.salt) {
    throw new Error('Invalid key backup file — missing required fields (encryptedKey, iv, salt).');
  }

  const normalised: StoredKeyBundle = {
    encryptedKey: parsed.encryptedKey,
    iv: parsed.iv,
    salt: parsed.salt,
    version: parsed.version ?? 1,
    ...(parsed.publicKeyJwk ? { publicKeyJwk: parsed.publicKeyJwk } : {}),
  };

  // Save current state so we can roll back on failure
  const prev = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(normalised));

  try {
    const key = await loadPrivateKey(passphrase);
    if (!key) {
      throw new Error('Passphrase verification failed — wrong passphrase or corrupt backup file.');
    }
    // Key decrypted successfully — bundle is now committed to localStorage
  } catch (err) {
    // Roll back
    if (prev !== null) {
      localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, prev);
    } else {
      localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
    }
    throw err;
  }
};

// ─── Dev Diagnostics (never logs key material) ───────────────────────────────

/**
 * Return safe diagnostic information about the stored private key bundle.
 * Never includes the actual private key, passphrase, or raw key bytes.
 * Only active in development builds (returns {} in production).
 */
export const getPrivateKeyDiagnostics = (): Record<string, unknown> => {
  if (process.env.NODE_ENV !== 'development') return {};

  const stored = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) {
    return { keyPresent: false, reason: 'localStorage entry missing' };
  }

  try {
    const bundle: StoredKeyBundle = JSON.parse(stored);
    const saltBytes = Uint8Array.from(atob(bundle.salt), (c) => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(bundle.iv), (c) => c.charCodeAt(0));
    const ciphertextBytes = Uint8Array.from(atob(bundle.encryptedKey), (c) => c.charCodeAt(0));

    return {
      keyPresent: true,
      version: bundle.version ?? 'unset',
      saltLengthBytes: saltBytes.length,          // expected: 16
      ivLengthBytes: ivBytes.length,               // expected: 12
      encryptedKeyLengthBytes: ciphertextBytes.length, // expected: ~2600+
      saltLengthValid: saltBytes.length === 16,
      ivLengthValid: ivBytes.length === 12,
    };
  } catch {
    return { keyPresent: false, reason: 'bundle parse error — localStorage may be corrupt' };
  }
};
