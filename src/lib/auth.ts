export const AUTH_COOKIE = 'vst_auth';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Valor esperado do cookie: hash de (senha + segredo). Sem estado no servidor. */
export async function makeToken(): Promise<string> {
  const pw = process.env.APP_PASSWORD ?? '';
  const secret = process.env.AUTH_SECRET ?? '';
  return sha256Hex(`${pw}::${secret}`);
}

export async function isValidToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  if (!process.env.APP_PASSWORD || !process.env.AUTH_SECRET) return false;
  const expected = await makeToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
