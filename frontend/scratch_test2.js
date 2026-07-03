import crypto from 'crypto';

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

async function getAESGCMKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.webcrypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.webcrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function test() {
  const { webcrypto } = crypto;
  
  // 1. Generate RSA keypair
  const keyPair = await webcrypto.subtle.generateKey(RSA_ALGORITHM, true, ['wrapKey', 'unwrapKey']);
  
  // 2. Export Private Key (PKCS8)
  const pkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  
  // 3. Encrypt PKCS8 with AES-GCM (simulating storePrivateKey)
  const passphrase = "my-secure-password";
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  
  const aesKey = await getAESGCMKey(passphrase, salt);
  const encryptedPKCS8 = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    pkcs8
  );
  
  // Simulated LocalStorage bundle
  const bundle = {
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedPKCS8))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt))
  };
  
  // 4. Decrypt PKCS8 with AES-GCM (simulating loadPrivateKey)
  const bundleSalt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
  const bundleIv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
  const bundleEncryptedKey = Uint8Array.from(atob(bundle.encryptedKey), c => c.charCodeAt(0));
  
  const aesKeyDec = await getAESGCMKey(passphrase, bundleSalt);
  
  try {
    const decryptedPKCS8 = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bundleIv },
      aesKeyDec,
      bundleEncryptedKey
    );
    
    // 5. Import Private Key
    const restoredPrivateKey = await webcrypto.subtle.importKey(
      'pkcs8',
      decryptedPKCS8,
      RSA_ALGORITHM,
      false,
      ['unwrapKey']
    );
    console.log("Success! Restored key type:", restoredPrivateKey.type);
    
    // 6. Test with wrap/unwrap
    const dataKey = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const wrapped = await webcrypto.subtle.wrapKey('raw', dataKey, keyPair.publicKey, { name: 'RSA-OAEP' });
    
    const unwrapped = await webcrypto.subtle.unwrapKey(
      'raw',
      wrapped,
      restoredPrivateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    console.log("Success! Unwrapped with restored private key.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
