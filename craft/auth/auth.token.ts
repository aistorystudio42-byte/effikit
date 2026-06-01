/**
 * @keywords    jwt sign, jwt verify, jwt decode, jwt payload claims, bearer token, token signing secret, encode token, token rotation, parse jwt
 * @domain      Auth Token
 * @use-when    Creating, signing, verifying, and decoding JWT tokens; managing token rotation
 * @not-when    Session storage or persistence — use auth.session.ts; OAuth flows — use provider SDKs
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtHeader {
  alg: "HS256" | "HS384" | "HS512" | "RS256" | "RS384" | "RS512";
  typ: "JWT";
  kid?: string;
}

export interface JwtClaims {
  // Standard claims (RFC 7519)
  sub?:  string;   // subject (user ID)
  iss?:  string;   // issuer
  aud?:  string | string[];   // audience
  exp?:  number;   // expiry (unix seconds)
  nbf?:  number;   // not before (unix seconds)
  iat?:  number;   // issued at (unix seconds)
  jti?:  string;   // JWT ID (prevents replay)
  // Custom claims
  [key: string]: unknown;
}

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;   // seconds
  tokenType:    "Bearer";
}

export interface VerifyResult<T extends JwtClaims = JwtClaims> {
  valid:    boolean;
  claims:   T | null;
  error?:   "expired" | "invalid_signature" | "malformed" | "not_yet_valid" | "unknown";
  expiredAt?: Date;
}

// ─── Base64URL helpers (no external deps) ────────────────────────────────────

function base64UrlEncode(data: string): string {
  // FIX: Provide Node.js fallback for btoa
  const b64 = typeof btoa === "function" ? btoa(data) : Buffer.from(data).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(data: string): string {
  const pad = data.length % 4;
  const padded = pad ? data + "=".repeat(4 - pad) : data;
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  // FIX: Provide Node.js fallback for atob
  return typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf-8");
}

// ─── HMAC-SHA256 signing (Web Crypto API) ────────────────────────────────────

async function hmacSign(payload: string, secret: string): Promise<string> {
  // FIX: Guard against missing Web Crypto API (insecure contexts / older Node)
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is required but not available. Ensure you are in a secure context (HTTPS) or Node.js 18+.");
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  
  // FIX: Prevent 'Maximum call stack size exceeded' on large buffers
  let binary = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// ─── JWT Core ─────────────────────────────────────────────────────────────────

export async function signJwt(
  claims: JwtClaims,
  secret: string,
  options: { expiresIn?: number; issuer?: string; audience?: string | string[]; jwtId?: boolean } = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const fullClaims: JwtClaims = {
    iat: now,
    nbf: now,
    // FIX: Fallback for crypto.randomUUID in older Node or non-secure browser contexts
    jti: options.jwtId ? (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`) : undefined,
    iss: options.issuer,
    aud: options.audience,
    exp: options.expiresIn ? now + options.expiresIn : undefined,
    ...claims,
  };

  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const headerB64  = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullClaims));
  const message    = `${headerB64}.${payloadB64}`;
  const signature  = await hmacSign(message, secret);

  return `${message}.${signature}`;
}

export async function verifyJwt<T extends JwtClaims = JwtClaims>(
  token: string,
  secret: string,
  options: { audience?: string | string[]; issuer?: string; clockTolerance?: number } = {}
): Promise<VerifyResult<T>> {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, claims: null, error: "malformed" };

  const [headerB64, payloadB64, signature] = parts;
  const message = `${headerB64}.${payloadB64}`;

  // Verify signature
  const sigValid = await hmacVerify(message, signature, secret);
  if (!sigValid) return { valid: false, claims: null, error: "invalid_signature" };

  let claims: T;
  try {
    claims = JSON.parse(base64UrlDecode(payloadB64)) as T;
  } catch {
    return { valid: false, claims: null, error: "malformed" };
  }

  const now = Math.floor(Date.now() / 1000);
  const tolerance = options.clockTolerance ?? 0;

  // Check expiry
  if (claims.exp && now > claims.exp + tolerance) {
    return { valid: false, claims, error: "expired", expiredAt: new Date(claims.exp * 1000) };
  }

  // Check not-before
  if (claims.nbf && now < claims.nbf - tolerance) {
    return { valid: false, claims, error: "not_yet_valid" };
  }

  // Check issuer
  if (options.issuer && claims.iss !== options.issuer) {
    return { valid: false, claims, error: "invalid_signature" };
  }

  // Check audience
  if (options.audience) {
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const expected = Array.isArray(options.audience) ? options.audience : [options.audience];
    const audValid = expected.some((e) => aud.includes(e));
    if (!audValid) return { valid: false, claims, error: "invalid_signature" };
  }

  return { valid: true, claims };
}

export function decodeJwt<T extends JwtClaims = JwtClaims>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as T;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds: number = 0): boolean {
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return Math.floor(Date.now() / 1000) >= claims.exp - bufferSeconds;
}

export function getTokenExpiry(token: string): Date | null {
  const claims = decodeJwt(token);
  if (!claims?.exp) return null;
  return new Date(claims.exp * 1000);
}

// ─── Token Rotation Manager ───────────────────────────────────────────────────

export interface TokenRotationConfig {
  secret:           string;
  accessTokenTtl?:  number;   // seconds (default: 15 min)
  refreshTokenTtl?: number;   // seconds (default: 7 days)
  issuer?:          string;
  audience?:        string;
}

export class TokenManager {
  private config: Required<TokenRotationConfig>;

  constructor(config: TokenRotationConfig) {
    this.config = {
      accessTokenTtl:  15 * 60,        // 15 minutes
      refreshTokenTtl: 7 * 24 * 3600, // 7 days
      issuer:  "effikit",
      audience: "app",
      ...config,
    };
  }

  async issueTokenPair(payload: JwtClaims): Promise<TokenPair> {
    const baseOpts = { issuer: this.config.issuer, audience: this.config.audience, jwtId: true };

    const [accessToken, refreshToken] = await Promise.all([
      signJwt({ ...payload, type: "access" },  this.config.secret, { ...baseOpts, expiresIn: this.config.accessTokenTtl }),
      signJwt({ sub: String(payload.sub), type: "refresh" }, this.config.secret, { ...baseOpts, expiresIn: this.config.refreshTokenTtl }),
    ]);

    return { accessToken, refreshToken, expiresIn: this.config.accessTokenTtl, tokenType: "Bearer" };
  }

  async verifyAccess<T extends JwtClaims = JwtClaims>(token: string): Promise<VerifyResult<T>> {
    const result = await verifyJwt<T>(token, this.config.secret, {
      issuer: this.config.issuer, audience: this.config.audience,
    });
    if (result.valid && (result.claims as JwtClaims).type !== "access") {
      return { valid: false, claims: null, error: "invalid_signature" };
    }
    return result;
  }

  async verifyRefresh(token: string): Promise<VerifyResult> {
    const result = await verifyJwt(token, this.config.secret, {
      issuer: this.config.issuer, audience: this.config.audience,
    });
    if (result.valid && result.claims?.type !== "refresh") {
      return { valid: false, claims: null, error: "invalid_signature" };
    }
    return result;
  }

  // Issue new access token from a valid refresh token
  async rotate(refreshToken: string, newPayload: JwtClaims): Promise<TokenPair | null> {
    const result = await this.verifyRefresh(refreshToken);
    if (!result.valid) return null;
    return this.issueTokenPair(newPayload);
  }
}

// ─── HTTP Header Helpers ──────────────────────────────────────────────────────

export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function bearerHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/*
 * Usage Examples:
 *
 * const tokenManager = new TokenManager({ secret: process.env.JWT_SECRET! });
 *
 * // Issue tokens on login
 * const tokens = await tokenManager.issueTokenPair({ sub: user.id, email: user.email, roles: user.roles });
 *
 * // Verify on each request (middleware)
 * const result = await tokenManager.verifyAccess(extractBearerToken(req.headers.authorization));
 * if (!result.valid) return res.status(401).json({ error: "Unauthorized" });
 * const { sub, roles } = result.claims!;
 *
 * // Rotate when access token expires
 * const newTokens = await tokenManager.rotate(refreshToken, { sub: userId, roles });
 */
