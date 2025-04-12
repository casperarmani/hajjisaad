import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // For now, only handle dashboard and material paths to reduce complexity
  // Root path is now our public homepage
  // Handle all other auth redirects client-side
  
  // Protected routes (dashboard and material) require login
  if (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/material')) {
    // Client-side auth handling will manage these redirects now
    // We previously redirected the root to login, but now we display our homepage
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};