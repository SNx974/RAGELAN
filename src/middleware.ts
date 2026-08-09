import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE = process.env.AUTH_COOKIE_NAME ?? 'rage_session';

const RANK: Record<string, number> = {
  PLAYER: 0,
  ORGANIZER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/** Niveau minimum requis par préfixe d'URL. */
const GUARDS: Array<[string, number]> = [
  ['/admin', RANK.ADMIN],
  ['/staff', RANK.ORGANIZER],
  ['/dashboard', RANK.PLAYER],
  ['/inscription', RANK.PLAYER],
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const guard = GUARDS.find(([prefix]) => pathname.startsWith(prefix));
  if (!guard) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role ?? 'PLAYER');

    if ((RANK[role] ?? 0) < guard[1]) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE);
    return response;
  }
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/dashboard/:path*', '/inscription/:path*'],
};
