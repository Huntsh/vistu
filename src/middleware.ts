import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, verifySession } from './lib/auth';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt).*)'],
};

const PUBLIC = ['/login', '/signup', '/api/login', '/api/signup', '/api/logout'];

function isPublic(pathname: string): boolean {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const adminArea =
    pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin');
  if (adminArea && session.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const headers = new Headers(req.headers);
  headers.set('x-account-id', session.sub);
  headers.set('x-account-role', session.role);
  headers.set('x-account-email', encodeURIComponent(session.email || ''));
  return NextResponse.next({ request: { headers } });
}
