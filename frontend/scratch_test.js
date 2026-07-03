import crypto from 'crypto';

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

async function test() {
  const { webcrypto } = crypto;
  
  // 1. Generate RSA keypair
  const keyPair = await webcrypto.subtle.generateKey(RSA_ALGORITHM, true, ['wrapKey', 'unwrapKey']);
  
  // 2. Generate AES key
  const aesKey = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  
  // 3. Wrap
  const wrappedKey = await webcrypto.subtle.wrapKey('raw', aesKey, keyPair.publicKey, { name: 'RSA-OAEP' });
  const wrappedBase64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKey)));
  
  // 4. Unwrap
  const wrappedKeyBytes = Uint8Array.from(atob(wrappedBase64), (c) => c.charCodeAt(0));
  try {
    const unwrapped = await webcrypto.subtle.unwrapKey(
      'raw',
      wrappedKeyBytes,
      keyPair.privateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    console.log("Success! Unwrapped key type:", unwrapped.type);
  } catch (err) {
    console.error("Unwrap failed:", err);
  }
}

test();
