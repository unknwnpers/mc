/**
 * lib/encryption.ts
 * Utility to encrypt and decrypt strings (JSON data, tokens, etc.)
 * Uses native Web Crypto API (available in modern browsers and Node.js >= 20).
 * Fully isomorphic (Edge, Client, Server Components, API routes).
 */

// Helper: Convert ArrayBuffer/Uint8Array to Base64 safely
const bufferToBase64 = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  // Fallback for Node.js if btoa is somehow missing, though it's standard now.
  return Buffer.from(bytes).toString('base64');
};

// Helper: Convert Base64 to Uint8Array safely
const base64ToBuffer = (base64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }
  // Fallback for Node.js
  const buf = Buffer.from(base64, 'base64');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
};

/**
 * Derives an AES-GCM key from a string secret using PBKDF2.
 */
const deriveKey = async (secret: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // A fixed salt for simplicity, allowing decryption across different sessions
  // In highly strict environments, salt should be dynamic and prepended to ciphertext.
  const salt = enc.encode("miksandchiks-secure-salt-2026-v1"); 

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Encrypts a string (e.g., JSON stringified object) using AES-GCM.
 * @param data The plaintext data to encrypt.
 * @param secret Optional encryption key. Defaults to process.env.ENCRYPTION_SECRET if on server.
 * @returns Base64 encoded string containing the IV and the encrypted data.
 */
export async function encryptData(data: string, secret?: string): Promise<string> {
  const secretKey = secret || process.env.ENCRYPTION_SECRET;
  if (!secretKey) {
    throw new Error("Encryption requires a secret key. Pass it as an argument or set ENCRYPTION_SECRET in .env");
  }

  try {
    const key = await deriveKey(secretKey);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM requires a 12-byte IV
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    // Combine IV and Encrypted Data: [ IV (12 bytes) | CipherText ]
    const encryptedArray = new Uint8Array(encryptedData);
    const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
    combinedArray.set(iv, 0);
    combinedArray.set(encryptedArray, iv.length);

    return bufferToBase64(combinedArray);
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data.");
  }
}

/**
 * Decrypts a Base64 encoded string (IV + CipherText) using AES-GCM.
 * @param encryptedBase64 The base64 string produced by `encryptData`.
 * @param secret Optional encryption key. Defaults to process.env.ENCRYPTION_SECRET if on server.
 * @returns The decrypted plaintext string.
 */
export async function decryptData(encryptedBase64: string, secret?: string): Promise<string> {
  const secretKey = secret || process.env.ENCRYPTION_SECRET;
  if (!secretKey) {
    throw new Error("Decryption requires a secret key. Pass it as an argument or set ENCRYPTION_SECRET in .env");
  }

  try {
    const combinedArray = base64ToBuffer(encryptedBase64);

    // Extract IV (first 12 bytes) and CipherText (the rest)
    const iv = combinedArray.slice(0, 12);
    const encryptedData = combinedArray.slice(12);

    const key = await deriveKey(secretKey);

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data. Invalid key or corrupted data.");
  }
}

/**
 * Utility to easily encrypt objects
 */
export async function encryptObject(obj: any, secret?: string): Promise<string> {
  return encryptData(JSON.stringify(obj), secret);
}

/**
 * Utility to easily decrypt objects
 */
export async function decryptObject<T = any>(encryptedBase64: string, secret?: string): Promise<T> {
  const decrypted = await decryptData(encryptedBase64, secret);
  return JSON.parse(decrypted) as T;
}
