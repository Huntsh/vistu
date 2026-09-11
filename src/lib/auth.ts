// ════════════════════════════════════════════════════════════════════════════
//  Sessão assinada (HMAC-SHA256) + hash de senha (PBKDF2-SHA256)
//  Tudo em Web Crypto (`crypto.subtle`) para rodar também no middleware (Edge).
// ════════════════════════════════════════════════════════════════════════════

export const AUTH_COOKIE = 'vst_sess';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 ano

export type Role = 'user' | 'admin';

export interface SessionPayload {
  sub: string; // id da conta
  role: Role;
  email: string;
  exp: number; // unix seconds
}

// ─── base64url ──────────────────────────────────────────────────────────────
function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── Sessão ─────────────────────────────────────────────────────────────────
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function hmacB64url(secret: string, body: string): Promise<string> {
  const key = await hmacKey(secret);
  const raw = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(body)));
  return b64urlEncode(raw);
}

export async function signSession(
  data: { sub: string; role: Role; email: string; exp?: number },
): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? '';
  const payload: SessionPayload = {
    sub: data.sub,
    role: data.role,
    email: data.email,
    exp: data.exp ?? Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncode(utf8(JSON.stringify(payload)));
  const sig = await hmacB64url(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = await hmacB64url(secret, body);
  } catch {
    return null;
  }
  if (!timingSafeEqual(sig, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (!payload?.sub || (payload.role !== 'user' && payload.role !== 'admin')) return null;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

// ─── Hash de senha (PBKDF2-SHA256) ──────────────────────────────────────────
const PBKDF2_ITERATIONS = 150_000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Formato guardado: `pbkdf2$<iteracoes>$<salt_b64url>$<hash_b64url>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64urlEncode(salt)}$${b64urlEncode(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = (stored ?? '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  let salt: Uint8Array;
  try {
    salt = b64urlDecode(parts[2]);
  } catch {
    return false;
  }
  const got = b64urlEncode(await pbkdf2(password, salt, iterations));
  return timingSafeEqual(got, parts[3]);
}
