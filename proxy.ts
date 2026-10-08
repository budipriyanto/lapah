import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromCookie, verifyToken } from './utils/auth/jwt';

/**
 * Middleware for JWT verification
 * Verifies JWT token and extracts user information
 * Can be used to protect API routes
 */
export function proxy(request: NextRequest) {
  // Get token from cookie
  const cookieHeader = request.headers.get('cookie') || undefined;
  const token = extractTokenFromCookie(cookieHeader);

  // Verify token if present
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Token is valid - you can add user info to request headers if needed
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-email', payload.email);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // Token not found or invalid - continue without user context
  return NextResponse.next();
}

/**
 * Configure which routes should use this middleware
 * Apply to all API routes that need authentication
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
