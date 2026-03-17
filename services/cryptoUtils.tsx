// services/cryptoUtils.ts

// Trasforma una stringa (Master Password) in una chiave utilizzabile per cifrare
export async function deriveKey(password: string, salt: Uint8Array) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Cripta i dati e genera un vettore di inizializzazione (IV)
export async function encryptData(text: string, key: CryptoKey): Promise<{ encryptedData: string, iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encryptedContent = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );

  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedContent)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { encryptedData: encryptedBase64, iv: ivBase64 };
}

// Decripta i dati usando l'IV e la chiave
export async function decryptData(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  const decryptedContent = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedContent);
}