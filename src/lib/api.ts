'use client';

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error('Sessão expirada.');
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(json?.error || `Erro ${res.status}`);
  }
  return json as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url, { cache: 'no-store' }).then((r) => handle<T>(r));
}

export function apiSend<T>(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => handle<T>(r));
}
