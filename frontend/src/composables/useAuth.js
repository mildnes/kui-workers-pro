const toBase64Url = bytes => {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export function generateRealityKeys() {
  const keypair = window.nacl.box.keyPair();
  return {
    privateKey: toBase64Url(keypair.secretKey),
    publicKey: toBase64Url(keypair.publicKey),
    shortId: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
  };
}

export function generateSs2022Password(method = '2022-blake3-aes-256-gcm') {
  const key = new Uint8Array(method.includes('128') ? 16 : 32);
  crypto.getRandomValues(key);
  let raw = '';
  for (const byte of key) raw += String.fromCharCode(byte);
  return btoa(raw);
}
