import jwt, { SignOptions, Secret } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  tv?: number;
  iat?: number;
  exp?: number;
}

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-super-secret-key-min-32-chars';

/**
 * Generate a JWT token
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @param tokenVersion - Current token_version of the user (invalidates old sessions on password reset)
 * @returns JWT token string
 */
export function generateToken(
  userId: string,
  email: string,
  role: 'user' | 'admin' | 'moderator',
  tokenVersion: number = 0
): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    tv: tokenVersion,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from cookie string
 * @param cookieHeader - Cookie header value
 * @param tokenName - Cookie name (default: 'auth_token')
 * @returns Token value or null
 */
export function extractTokenFromCookie(
  cookieHeader: string | undefined,
  tokenName: string = 'auth_token'
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === tokenName) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Create a Set-Cookie header value
 * @param token - JWT token
 * @returns Cookie string for Set-Cookie header
 */
export function createAuthCookie(token: string): string {
  // Calculate expiration date (7 days from now)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);

  return [
    `auth_token=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure', // Only send over HTTPS in production
    'SameSite=Strict',
    `Expires=${expirationDate.toUTCString()}`,
  ].join('; ');
}

/**
 * Create a clear-cookie header value
 * @returns Cookie string to clear auth_token
 */
export function createClearCookie(): string {
  return [
    'auth_token=',
    'Path=/',
    'HttpOnly',
    'Expires=Thu, 01 Jan 1970 00:00:00 UTC',
  ].join('; ');
}
