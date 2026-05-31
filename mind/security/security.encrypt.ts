/**
 * @keywords    AES, RSA, encryption, decryption, Web Crypto, symmetric, asymmetric, PBKDF2, key derivation
 * @domain      Security Encrypt
 * @use-when    Encrypting sensitive data using Web Crypto API: AES-GCM for symmetric, RSA-OAEP for asymmetric
 * @not-when    You need custom cipher implementations — always use established algorithms via Web Crypto
 *
 * @fixes
 *  - [CRITICAL] toBase64() now uses a loop instead of spread operator to prevent
 *    call-stack overflow on buffers > 65 536 bytes (Function.apply argument limit).
 *  - [SECURITY] PBKDF2 iteration count raised from 310 000 to 600 000 to meet
 *    NIST SP 800-132 (2023) recommendations for SHA-256.
 *  - [SECURITY] Salt length raised from 16 to 32 bytes (256-bit entropy).
 *  - [SECURITY] RSA modulusLength option exposed so callers can choose 4096-bit
 *    keys for post-2030 security (NIST SP 800-131A Rev. 2).
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

export interface RSAKeyOptions {
  /** Key size in bits. 2048 = legacy; 3072 = NIST 2030+; 4096 = long-term safe. @default 2048 */
  modulusLength?: 2048 | 3072 | 4096;
}

// ─── Encoding Helpers ─────────────────────────────────────────────────────────

/**
 * Converts an ArrayBuffer to a Base64 string without using spread-operator argument
 * passing, which overflows the call stack for buffers larger than ~65 KB.
 *
 * @complexity O(n) time, O(n) space — n = byte length of buf
 */
const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let binary = "";
  // Chunked approach: avoids String.fromCharCode.apply() call-stack limit
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const toBytes   = (str: string): Uint8Array => new TextEncoder().encode(str);
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

  /**
   * Derive a 256-bit AES-GCM key from a password using PBKDF2-SHA256.
   *
   * Iteration count: 600 000 (NIST SP 800-132, 2023 guidance for SHA-256).
   * Salt length:     32 bytes (256-bit entropy, exceeds NIST's 16-byte minimum).
   */
  async deriveKey(
    password: string,
    salt?: Uint8Array
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    // 32-byte salt: 256-bit entropy, exceeds NIST minimum (16 bytes)
    const actualSalt = salt ?? crypto.getRandomValues(new Uint8Array(32));

    const baseKey = await crypto.subtle.importKey(
      "raw", toBytes(password), "PBKDF2", false, ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: actualSalt,
        // NIST SP 800-132 (2023) recommends ≥ 600 000 iterations for SHA-256
        iterations: 600_000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    return { key, salt: actualSalt };
  },

  /** Encrypt plaintext string with AES-GCM (authenticated encryption). */
  async encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV — GCM standard
    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      toBytes(plaintext)
    );

    return {
      ciphertext: toBase64(cipherBuf),
      iv: toBase64(iv),
      algorithm: "AES-GCM-256",
    };
  },

  /** Decrypt an AES-GCM payload. Throws if the ciphertext has been tampered with. */
  async decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(payload.iv) },
      key,
      fromBase64(payload.ciphertext)
    );
    return fromBytes(plainBuf);
  },

  /** Encrypt using a password (derives key internally; stores 32-byte salt in payload). */
  async encryptWithPassword(plaintext: string, password: string): Promise<EncryptedPayload> {
    const { key, salt } = await AES.deriveKey(password);
    const payload = await AES.encrypt(plaintext, key);
    return { ...payload, salt: toBase64(salt) };
  },

  /** Decrypt using a password. Reads the stored salt from the payload. */
  async decryptWithPassword(payload: EncryptedPayload, password: string): Promise<string> {
    if (!payload.salt) throw new Error("No salt in payload — was this encrypted with a password?");
    const { key } = await AES.deriveKey(password, fromBase64(payload.salt));
    return AES.decrypt(payload, key);
  },

  /** Export a CryptoKey to a Base64-encoded raw byte string. */
  async exportKey(key: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", key);
    return toBase64(raw);
  },

  /** Import a CryptoKey from a Base64-encoded raw byte string. */
  async importKey(b64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "raw", fromBase64(b64), { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
  },
};

// ─── RSA-OAEP Asymmetric Encryption ──────────────────────────────────────────

export const RSA = {
  /**
   * Generate an RSA-OAEP key pair.
   *
   * Default modulusLength: 2048 (compatible). For keys that must remain secure
   * beyond 2030, use 3072 or 4096 per NIST SP 800-131A Rev. 2.
   */
  async generateKeyPair(options: RSAKeyOptions = {}): Promise<KeyPair> {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: options.modulusLength ?? 2048,
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

  /**
   * Encrypt data with an RSA public key.
   * Maximum plaintext is (modulusLength/8 − 66) bytes for OAEP-SHA256.
   * For larger data use hybridEncrypt().
   */
  async encrypt(plaintext: string, publicKey: CryptoKey): Promise<string> {
    const enc = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      toBytes(plaintext)
    );
    return toBase64(enc);
  },

  /** Decrypt RSA-OAEP ciphertext with the private key. */
  async decrypt(cipherBase64: string, privateKey: CryptoKey): Promise<string> {
    const plain = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      fromBase64(cipherBase64)
    );
    return fromBytes(plain);
  },

  /** Import an RSA public key from SPKI Base64 format. */
  async importPublicKey(spkiBase64: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      "spki",
      fromBase64(spkiBase64),
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  },

  /**
   * Hybrid encryption: RSA wraps a one-time AES-256-GCM key; AES encrypts the payload.
   * Suitable for data of any length (no RSA plaintext-size limit).
   */
  async hybridEncrypt(
    plaintext: string,
    publicKey: CryptoKey
  ): Promise<{ encryptedKey: string; payload: EncryptedPayload }> {
    const aesKey      = await AES.generateKey();
    const exportedKey = await AES.exportKey(aesKey);
    const encryptedKey = await RSA.encrypt(exportedKey, publicKey);
    const payload      = await AES.encrypt(plaintext, aesKey);
    return { encryptedKey, payload };
  },

  async hybridDecrypt(
    encryptedKey: string,
    payload: EncryptedPayload,
    privateKey: CryptoKey
  ): Promise<string> {
    const exportedKey = await RSA.decrypt(encryptedKey, privateKey);
    const aesKey      = await AES.importKey(exportedKey);
    return AES.decrypt(payload, aesKey);
  },
};

// ─── HMAC — Message Authentication ───────────────────────────────────────────

export const HMAC = {
  /** Generate a random HMAC-SHA256 key. */
  async generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign", "verify"]
    );
  },

  /** Sign a message string; returns Base64-encoded signature. */
  async sign(message: string, key: CryptoKey): Promise<string> {
    const sig = await crypto.subtle.sign("HMAC", key, toBytes(message));
    return toBase64(sig);
  },

  /**
   * Verify a message/signature pair.
   * Uses the Web Crypto API's constant-time comparison — safe against timing attacks.
   */
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
 * // ── AES-GCM with password (PBKDF2-SHA256, 600 000 iterations) ──────────────
 * const encrypted = await AES.encryptWithPassword("top secret", "my-password");
 * const decrypted = await AES.decryptWithPassword(encrypted, "my-password");
 * // decrypted === "top secret"
 *
 * // ── AES-GCM with a pre-generated key (large files safe) ───────────────────
 * const key  = await AES.generateKey();
 * const enc  = await AES.encrypt("hello world".repeat(10_000), key); // > 65 KB — no overflow
 * const dec  = await AES.decrypt(enc, key);
 *
 * // ── RSA hybrid encryption (arbitrary-length data) ─────────────────────────
 * const { publicKey, privateKey } = await RSA.generateKeyPair({ modulusLength: 4096 });
 * const { encryptedKey, payload } = await RSA.hybridEncrypt("large data here", publicKey);
 * const original = await RSA.hybridDecrypt(encryptedKey, payload, privateKey);
 *
 * // ── HMAC request signing ───────────────────────────────────────────────────
 * const hmacKey  = await HMAC.generateKey();
 * const sig      = await HMAC.sign(requestBody, hmacKey);
 * const valid    = await HMAC.verify(requestBody, sig, hmacKey);
 */
