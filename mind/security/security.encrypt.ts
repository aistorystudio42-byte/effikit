/**
 * @keywords    AES, RSA, encryption, decryption, Web Crypto, symmetric, asymmetric, PBKDF2, key derivation
 * @domain      Security Encrypt
 * @use-when    Encrypting sensitive data using Web Crypto API: AES-GCM for symmetric, RSA-OAEP for asymmetric
 * @not-when    You need custom cipher implementations — always use established algorithms via Web Crypto
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  ciphertext: string;  // Base64-encoded ciphertext
  iv: string;          // Base64-encoded initialization vector
  salt?: string;       // Base64-encoded salt (for password-derived keys)
  algorithm: string;
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;  // Exportable base64 SPKI format
}

// ─── Encoding Helpers ─────────────────────────────────────────────────────────

const toBase64  = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const toBytes  = (str: string): Uint8Array => new TextEncoder().encode(str);
const fromBytes = (buf: ArrayBuffer): string => new TextDecoder().decode(buf);

// ─── AES-GCM Symmetric Encryption ────────────────────────────────────────────

export const AES = {
  /** Generate a random 256-bit AES-GCM key */
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,  // extractable
      ["encrypt", "decrypt"]
    );
  },

  /** Derive an AES key from a password using PBKDF2 */
  async deriveKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const actualSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));

    const baseKey = await crypto.subtle.importKey(
      "raw", toBytes(password), "PBKDF2", false, ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: actualSalt, iterations: 310_000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    return { key, salt: actualSalt };
  },

  /** Encrypt plaintext string with AES-GCM */
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toBytes(plaintext)
    );

    return {
      ciphertext: toBase64(cipherBuf),
      iv: toBase64(iv),
      algorithm: "AES-GCM",
    };
  },

  /** Decrypt AES-GCM payload */
  async decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.ciphertext)
    );
    return fromBytes(plainBuf);
  },

  /** Encrypt with a password (derives key internally, stores salt in payload) */
  async encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload> {
    const { key, salt } = await AES.deriveKey(password);
    const payload = await AES.encrypt(plaintext, key);
    return { ...payload, salt: toBase64(salt) };
  },

  /** Decrypt with a password */
  async decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string> {
    if (!payload.salt) throw new Error("No salt in payload — was this encrypted with a password?");
    const { key } = await AES.deriveKey(password, fromBase64(payload.salt));
    return AES.decrypt(payload, key);
  },

  /** Export CryptoKey to base64 raw bytes */
  async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", key);
    return toBase64(raw);
  },

  /** Import CryptoKey from base64 raw bytes */
  async importKey(b64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "raw", fromBase64(b64), { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
  },
};

// ─── RSA-OAEP Asymmetric Encryption ──────────────────────────────────────────

export const RSA = {
  /** Generate an RSA-OAEP key pair (2048-bit) */
  async generateKeyPair(): Promise<KeyPair> {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const pubSpki = await crypto.subtle.exportKey("spki", pair.publicKey);

    return {
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      publicKeyPem: toBase64(pubSpki),
    };
  },

  /** Encrypt data with RSA public key (max ~190 bytes for 2048-bit RSA) */
  async encrypt(plaintext: string, publicKey: CryptoKey): Promise<string> {
    const enc = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      toBytes(plaintext)
    );
    return toBase64(enc);
  },

  /** Decrypt RSA-OAEP ciphertext with private key */
  async decrypt(cipherBase64: string, privateKey: CryptoKey): Promise<string> {
    const plain = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      fromBase64(cipherBase64)
    );
    return fromBytes(plain);
  },

  /** Import an RSA public key from SPKI base64 format */
  async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "spki",
      fromBase64(spkiBase64),
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  },

  /** Hybrid encrypt: RSA wraps an AES key, AES encrypts the payload */
  async hybridEncrypt(
    plaintext: string,
    publicKey: CryptoKey
  ): Promise<{ encryptedKey: string; payload: EncryptedPayload }> {
    const aesKey = await AES.generateKey();
    const exportedKey = await AES.exportKey(aesKey);
    const encryptedKey = await RSA.encrypt(exportedKey, publicKey);
    const payload = await AES.encrypt(plaintext, aesKey);
    return { encryptedKey, payload };
  },

  async hybridDecrypt(
    encryptedKey: string,
    payload: EncryptedPayload,
    privateKey: CryptoKey
  ): Promise<string> {
    const exportedKey = await RSA.decrypt(encryptedKey, privateKey);
    const aesKey = await AES.importKey(exportedKey);
    return AES.decrypt(payload, aesKey);
  },
};

// ─── HMAC — Message Authentication ───────────────────────────────────────────

export const HMAC = {
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign", "verify"]
    );
  },

  async sign(message: string, key: CryptoKey): Promise<string> {
    const sig = await crypto.subtle.sign("HMAC", key, toBytes(message));
    return toBase64(sig);
  },

  async verify(message: string, signatureBase64: string, key: CryptoKey): Promise<boolean> {
    return crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64(signatureBase64),
      toBytes(message)
    );
  },
};

/*
 * Usage Example:
 *
 * // AES-GCM with password
 * const encrypted = await AES.encryptWithPassword("top secret", "my-password");
 * const decrypted = await AES.decryptWithPassword(encrypted, "my-password");
 * // decrypted === "top secret"
 *
 * // RSA hybrid encryption (encrypt large data with RSA)
 * const { publicKey, privateKey } = await RSA.generateKeyPair();
 * const { encryptedKey, payload } = await RSA.hybridEncrypt("large data here", publicKey);
 * const original = await RSA.hybridDecrypt(encryptedKey, payload, privateKey);
 *
 * // HMAC for request signing
 * const hmacKey = await HMAC.generateKey();
 * const signature = await HMAC.sign(requestBody, hmacKey);
 * const valid = await HMAC.verify(requestBody, signature, hmacKey);
 */
