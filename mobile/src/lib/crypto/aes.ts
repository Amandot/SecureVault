import forge from 'node-forge';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH_BYTES = 32; // 256 bits
const IV_LENGTH_BYTES = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * Generate a new random AES-256-GCM key
 */
export const generateAESKey = async (): Promise<ArrayBuffer> => {
  const bytes = forge.random.getBytesSync(KEY_LENGTH_BYTES);
  return forge.util.binary.raw.decode(bytes).buffer;
};

/**
 * Encrypt a file buffer with AES-256-GCM.
 * Web Crypto API appends the 16-byte auth tag to the end of the ciphertext.
 * We do the same to maintain interoperability.
 */
export const encryptFileAES = async (
  fileBuffer: ArrayBuffer,
  existingKeyBuffer?: ArrayBuffer
): Promise<{ encryptedData: ArrayBuffer; iv: Uint8Array; rawKey: ArrayBuffer }> => {
  const rawKey = existingKeyBuffer || (await generateAESKey());
  const ivStr = forge.random.getBytesSync(IV_LENGTH_BYTES);
  
  const rawKeyStr = forge.util.binary.raw.encode(new Uint8Array(rawKey));
  const cipher = forge.cipher.createCipher(ALGORITHM, rawKeyStr);
  
  cipher.start({ iv: ivStr });
  cipher.update(forge.util.createBuffer(new Uint8Array(fileBuffer)));
  cipher.finish();
  
  const ciphertextBytes = cipher.output.getBytes();
  const authTagBytes = cipher.mode.tag.getBytes();
  
  // Combine encrypted data and auth tag to match WebCrypto API format
  const finalEncryptedStr = ciphertextBytes + authTagBytes;
  const finalEncryptedBuffer = forge.util.binary.raw.decode(finalEncryptedStr).buffer;
  
  return { 
    encryptedData: finalEncryptedBuffer,
    iv: forge.util.binary.raw.decode(ivStr), 
    rawKey 
  };
};

/**
 * Decrypt an AES-256-GCM encrypted buffer.
 */
export const decryptFileAES = async (
  encryptedBuffer: ArrayBuffer,
  rawKey: ArrayBuffer,
  iv: Uint8Array | ArrayBuffer
): Promise<ArrayBuffer> => {
  const inputBuffer = new Uint8Array(encryptedBuffer);
  
  // Extract auth tag from the end
  const authTagStart = inputBuffer.length - AUTH_TAG_LENGTH_BYTES;
  const authTagArr = inputBuffer.subarray(authTagStart);
  const ciphertextArr = inputBuffer.subarray(0, authTagStart);
  
  const rawKeyStr = forge.util.binary.raw.encode(new Uint8Array(rawKey));
  const ivStr = forge.util.binary.raw.encode(new Uint8Array(iv));
  
  const decipher = forge.cipher.createDecipher(ALGORITHM, rawKeyStr);
  
  decipher.start({
    iv: ivStr,
    tag: forge.util.createBuffer(authTagArr)
  });
  
  decipher.update(forge.util.createBuffer(ciphertextArr));
  const pass = decipher.finish();
  
  if (!pass) {
    throw new Error('Decryption failed: authentication tag mismatch');
  }
  
  return forge.util.binary.raw.decode(decipher.output.getBytes()).buffer;
};

// ─── Passphrase-based Key Derivation ────────────────────────────────────────

/**
 * Derive an AES key from a passphrase using PBKDF2
 */
export const deriveKeyFromPassphrase = async (
  passphrase: string,
  salt?: Uint8Array
): Promise<{ rawKey: ArrayBuffer; salt: Uint8Array }> => {
  const saltStr = salt ? forge.util.binary.raw.encode(salt) : forge.random.getBytesSync(16);
  
  return new Promise((resolve) => {
    // node-forge pbkdf2 is synchronous if we don't yield, but it can be heavy.
    // Wrap it in a Promise anyway to keep API async.
    const derivedKeyStr = forge.pkcs5.pbkdf2(
      passphrase,
      saltStr,
      310000,
      KEY_LENGTH_BYTES,
      forge.md.sha256.create()
    );
    
    resolve({ 
      rawKey: forge.util.binary.raw.decode(derivedKeyStr).buffer, 
      salt: forge.util.binary.raw.decode(saltStr)
    });
  });
};

// ─── Utility ─────────────────────────────────────────────────────────────────

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  // Use a chunk size well below JS engine stack limits
  const CHUNK_SIZE = 8192; 
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    // Array.from is safer than .apply for React Native Hermes
    const chunk = Array.from(bytes.subarray(i, i + CHUNK_SIZE));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return forge.util.encode64(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = forge.util.decode64(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const uint8ArrayToBase64 = (arr: Uint8Array): string => {
  return arrayBufferToBase64(arr.buffer);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  return new Uint8Array(base64ToArrayBuffer(base64));
};
