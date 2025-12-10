import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth_token');

  // Login sayfasına erişim kontrolü
  if (request.nextUrl.pathname === '/login') {
    // Eğer zaten giriş yapılmışsa ana sayfaya yönlendir
    if (authCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Diğer sayfalar için authentication kontrolü
  if (!authCookie && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};


