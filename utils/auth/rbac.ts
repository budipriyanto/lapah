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
    // Role diambil dari DB (bukan klaim JWT) supaya perubahan role
    // langsung terbaca tanpa menunggu token expiry.
    const user = await dbQueryOne<{ token_version: number; role: 'user' | 'admin' | 'moderator' | null }>(
      `SELECT u.token_version, ur.role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = ?`,
      [payload.userId]
    );

    if (!user || user.token_version !== (payload.tv ?? 0)) {
      return null;
    }

    return { ...payload, role: user.role ?? 'user' };
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

export type AppRole = 'user' | 'admin' | 'moderator';

export const ROLE_RANK: Record<AppRole, number> = {
  user: 0,
  admin: 1,
  moderator: 2,
};

/**
 * Middleware to require specific role (hierarchy: moderator > admin > user)
 * Returns 403 if user's role rank is below the required role
 * @param req - Next.js request object
 * @param requiredRole - Required role
 * @returns User data or NextResponse with 401/403
 */
export async function requireRole(
  req: NextRequest,
  requiredRole: AppRole
): Promise<JWTPayload | NextResponse> {
  const user = await extractUser(req);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - No valid token' },
      { status: 401 }
    );
  }

  if ((ROLE_RANK[user.role] ?? -1) < ROLE_RANK[requiredRole]) {
    return NextResponse.json(
      { success: false, error: `Forbidden - ${requiredRole} role required` },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Middleware to require admin role (admin or moderator)
 * @param req - Next.js request object
 * @returns User data or NextResponse with 401/403
 */
export async function requireAdmin(
  req: NextRequest
): Promise<JWTPayload | NextResponse> {
  return requireRole(req, 'admin');
}

/**
 * Middleware to require superadmin (moderator) role — user management
 * @param req - Next.js request object
 * @returns User data or NextResponse with 401/403
 */
export async function requireSuperadmin(
  req: NextRequest
): Promise<JWTPayload | NextResponse> {
  return requireRole(req, 'moderator');
}

/**
 * Check if user has permission for action
 * @param role - User role
 * @param action - Action to check
 * @returns True if user has permission
 */
export function hasPermission(
  role: AppRole,
  action: string
): boolean {
  const userActions = [
    'browse_destinations',
    'view_reviews',
    'create_review',
    'create_bookmark',
  ];
  const contentActions = [
    'approve_review',
    'reject_review',
    'create_destination',
    'edit_destination',
    'delete_destination',
    'upload_image',
  ];
  const permissions: Record<AppRole, string[]> = {
    user: userActions,
    admin: [...userActions, ...contentActions],
    moderator: [
      ...userActions,
      ...contentActions,
      'manage_users',
      'manage_roles',
    ],
  };

  return permissions[role]?.includes(action) || false;
}
