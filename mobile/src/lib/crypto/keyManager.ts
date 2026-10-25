import forge from 'node-forge';
import { deriveKeyFromPassphrase, encryptFileAES, decryptFileAES, arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array, uint8ArrayToBase64 } from './aes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const PRIVATE_KEY_STORAGE_KEY = 'sv_private_key';

// ─── Key Pair Generation ─────────────────────────────────────────────────────

export const generateKeyPair = async () => {
  return new Promise<{ privateKey: forge.pki.PrivateKey; publicKey: forge.pki.PublicKey }>((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 4096, workers: -1 }, (err, keypair) => {
      if (err) reject(err);
      else resolve(keypair);
    });
  });
};

const _base64urlEncode = (str: string) => {
  return forge.util.encode64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const _base64urlDecode = (str: string) => {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return forge.util.decode64(b64);
};

export const exportPublicKeyToJwk = (publicKey: forge.pki.PublicKey): string => {
  const n = publicKey.n.toByteArray();
  const e = publicKey.e.toByteArray();
  
  // Clean leading zeros from BigInteger byte arrays if any
  const nClean = n[0] === 0 ? n.slice(1) : n;
  const eClean = e[0] === 0 ? e.slice(1) : e;
  
  const jwk = {
    kty: 'RSA',
    ext: true,
    n: _base64urlEncode(forge.util.binary.raw.encode(new Uint8Array(nClean))),
    e: _base64urlEncode(forge.util.binary.raw.encode(new Uint8Array(eClean))),
    alg: 'RSA-OAEP-256',
    key_ops: ['wrapKey']
  };
  return JSON.stringify(jwk);
};

export const exportPrivateKeyToPkcs8 = (privateKey: forge.pki.PrivateKey): ArrayBuffer => {
  const der = forge.pki.privateKeyToAsn1(privateKey);
  const p8 = forge.pki.wrapRsaPrivateKey(der);
  const p8Der = forge.asn1.toDer(p8).getBytes();
  return forge.util.binary.raw.decode(p8Der).buffer;
};

export const importPublicKeyFromJwk = (jwkString: string): forge.pki.PublicKey => {
  const jwk = JSON.parse(jwkString);
  const nStr = _base64urlDecode(jwk.n);
  const eStr = _base64urlDecode(jwk.e);
  
  const nArr = Array.from(forge.util.binary.raw.decode(nStr));
  const eArr = Array.from(forge.util.binary.raw.decode(eStr));
  
  // ensure positive BigInteger by prepending 0 if MSB is set
  if (nArr[0] & 0x80) nArr.unshift(0);
  if (eArr[0] & 0x80) eArr.unshift(0);

  const n = new forge.jsbn.BigInteger(nArr);
  const e = new forge.jsbn.BigInteger(eArr);
  return forge.pki.setRsaPublicKey(n, e);
};

export const importPrivateKeyFromPkcs8 = (pkcs8Buffer: ArrayBuffer): forge.pki.PrivateKey => {
  const derStr = forge.util.binary.raw.encode(new Uint8Array(pkcs8Buffer));
  const asn1 = forge.asn1.fromDer(derStr);
  return forge.pki.privateKeyFromAsn1(asn1);
};

// ─── Key Wrapping (RSA-OAEP over AES key) ───────────────────────────────────

export const wrapAESKey = async (aesKeyBuffer: ArrayBuffer, rsaPublicKey: forge.pki.PublicKey): Promise<string> => {
  const keyBytes = forge.util.binary.raw.encode(new Uint8Array(aesKeyBuffer));
  const wrapped = rsaPublicKey.encrypt(keyBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create()
    }
  });
  return forge.util.encode64(wrapped);
};

export const unwrapAESKey = async (wrappedKeyBase64: string, rsaPrivateKey: forge.pki.PrivateKey): Promise<ArrayBuffer> => {
  const wrappedBytes = forge.util.decode64(wrappedKeyBase64);
  const unwrapped = rsaPrivateKey.decrypt(wrappedBytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create()
    }
  });
  return forge.util.binary.raw.decode(unwrapped).buffer;
};

// ─── Local Storage (Encrypted Private Key) ──────────────────────────────────

export interface StoredKeyBundle {
  encryptedKey: string;
  iv: string;
  salt: string;
  version: number;
  publicKeyJwk?: string;
}

export const storePrivateKey = async (privateKeyBuffer: ArrayBuffer, passphrase: string, publicKeyJwk?: string): Promise<void> => {
  const { rawKey, salt } = await deriveKeyFromPassphrase(passphrase);
  const { encryptedData, iv } = await encryptFileAES(privateKeyBuffer, rawKey);

  const bundle: StoredKeyBundle = {
    encryptedKey: arrayBufferToBase64(encryptedData),
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
    version: 1,
    ...(publicKeyJwk ? { publicKeyJwk } : {}),
  };

  await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, JSON.stringify(bundle));
};

export const loadPrivateKey = async (passphrase: string): Promise<forge.pki.PrivateKey | null> => {
  const stored = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
  if (!stored) return null;

  try {
    const bundle: StoredKeyBundle = JSON.parse(stored);
    const { rawKey } = await deriveKeyFromPassphrase(passphrase, base64ToUint8Array(bundle.salt));
    const decryptedPrivateKeyBuffer = await decryptFileAES(
      base64ToArrayBuffer(bundle.encryptedKey),
      rawKey,
      base64ToUint8Array(bundle.iv)
    );
    return importPrivateKeyFromPkcs8(decryptedPrivateKeyBuffer);
  } catch (err) {
    throw new Error('Wrong master passphrase or corrupt key data.');
  }
};

export const clearPrivateKey = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
};

export const hasStoredPrivateKey = async (): Promise<boolean> => {
  return !!(await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY));
};
