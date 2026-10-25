import { encryptFileAES, decryptFileAES, arrayBufferToBase64, uint8ArrayToBase64, base64ToUint8Array } from './aes';
import { wrapAESKey, unwrapAESKey } from './keyManager';
import forge from 'node-forge';

export interface EncryptionOptions {
  rsaPublicKey: forge.pki.PublicKey;
}

export interface EncryptedFilePackage {
  encryptedData: ArrayBuffer;
  encryptedKey: string;
  iv: string;
  encryptionType: string;
  layerCount: number;
}

export interface DecryptionOptions {
  encryptedKeyBase64: string;
  ivBase64: string;
  rsaPrivateKey: forge.pki.PrivateKey;
}

export const encryptFile = async (
  fileBuffer: ArrayBuffer,
  options: EncryptionOptions
): Promise<EncryptedFilePackage> => {
  const { encryptedData, iv, rawKey } = await encryptFileAES(fileBuffer);
  const encryptedKey = await wrapAESKey(rawKey, options.rsaPublicKey);

  return {
    encryptedData,
    encryptedKey,
    iv: uint8ArrayToBase64(iv),
    encryptionType: 'AES-256-GCM',
    layerCount: 1,
  };
};

export const decryptFile = async (
  encryptedBuffer: ArrayBuffer,
  options: DecryptionOptions
): Promise<ArrayBuffer> => {
  const rawKey = await unwrapAESKey(options.encryptedKeyBase64, options.rsaPrivateKey);
  const iv = base64ToUint8Array(options.ivBase64);
  const decrypted = await decryptFileAES(encryptedBuffer, rawKey, iv);
  return decrypted;
};
