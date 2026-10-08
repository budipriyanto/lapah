import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromCookie, JWTPayload } from './jwt';
import { dbQueryOne } from '@/utils/db';

/**
 * Extract user from JWT token in request
 * @param req - Next.js request object
 * @returns User data or null if token invalid
 */
export async function extractUser(req: NextRequest): Promise<JWTPayload | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || undefined;
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    // Token invalid jika token_version di DB berbeda dari claim tv
    // (berubah saat password reset -> sesi lama hangus)
    const user = await dbQueryOne<{ token_version: number }>(
      'SELECT token_version FROM users WHERE id = ?',
      [payload.userId]
    );

    if (!user || user.token_version !== (payload.tv ?? 0)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Failed to extract user:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if user not authenticated
 * @param req - Next.js request object
 * @returns User data or NextResponse with 401
 */
export async function requireAuth(
  req: NextRequest
): Promise<JWTPayload | NextResponse> {
  const user = await extractUser(req);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - No valid token' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Middleware to require specific role
 * Returns 403 if user doesn't have required role
 * @param req - Next.js request object
 * @param requiredRole - Required role
 * @returns User data or NextResponse with 401/403
 */
export async function requireRole(
  req: NextRequest,
  requiredRole: 'user' | 'admin' | 'moderator'
): Promise<JWTPayload | NextResponse> {
  const user = await extractUser(req);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - No valid token' },
      { status: 401 }
    );
  }

  // Only admin can access admin routes
  // user and moderator roles check can be added later
  if (user.role !== requiredRole && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: `Forbidden - ${requiredRole} role required` },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Middleware to require admin role
 * @param req - Next.js request object
 * @returns User data or NextResponse with 401/403
 */
export async function requireAdmin(
  req: NextRequest
): Promise<JWTPayload | NextResponse> {
  return requireRole(req, 'admin');
}

/**
 * Check if user has permission for action
 * @param role - User role
 * @param action - Action to check
 * @returns True if user has permission
 */
export function hasPermission(
  role: 'user' | 'admin' | 'moderator',
  action: string
): boolean {
  const permissions: Record<string, string[]> = {
    user: ['browse_destinations', 'view_reviews', 'create_review', 'create_bookmark'],
    moderator: [
      'browse_destinations',
      'view_reviews',
      'create_review',
      'create_bookmark',
      'approve_review',
      'reject_review',
    ],
    admin: [
      'browse_destinations',
      'view_reviews',
      'create_review',
      'create_bookmark',
      'approve_review',
      'reject_review',
      'create_destination',
      'edit_destination',
      'delete_destination',
      'upload_image',
      'manage_users',
      'manage_roles',
    ],
  };

  return permissions[role]?.includes(action) || false;
}
