// ════════════════════════════════════════════════════════════════════════════
//  Helpers de sessão para as rotas de API (lado servidor).
//  O middleware injeta os headers x-account-*; aqui só lemos / validamos papel.
//  Fallback: se os headers não vierem, valida o cookie direto.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySession, type Role } from './auth';

export interface CurrentAccount {
  id: string;
  role: Role;
  email: string;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export async function getAccount(req: Request): Promise<CurrentAccount | null> {
  const id = req.headers.get('x-account-id');
  const role = req.headers.get('x-account-role') as Role | null;
  if (id && (role === 'user' || role === 'admin')) {
    const email = req.headers.get('x-account-email');
    return { id, role, email: email ? decodeURIComponent(email) : '' };
  }
  // Fallback (ex.: chamadas que não passam pelo middleware).
  const session = await verifySession(readCookie(req, AUTH_COOKIE));
  if (!session) return null;
  return { id: session.sub, role: session.role, email: session.email };
}

export async function requireAccount(req: Request): Promise<CurrentAccount> {
  const acc = await getAccount(req);
  if (!acc) throw new HttpError(401, 'Não autorizado.');
  return acc;
}

export async function requireAdmin(req: Request): Promise<CurrentAccount> {
  const acc = await requireAccount(req);
  if (acc.role !== 'admin') throw new HttpError(403, 'Acesso restrito ao administrador.');
  return acc;
}

/** Converte um erro (HttpError ou qualquer outro) numa resposta JSON. */
export function errorResponse(e: unknown, fallback = 'Erro interno.'): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : fallback;
  return NextResponse.json({ error: msg || fallback }, { status: 500 });
}
