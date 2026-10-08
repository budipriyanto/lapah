import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/utils/auth/password';
import { generateToken, createAuthCookie } from '@/utils/auth/jwt';
import { dbQueryOne } from '@/utils/db';

interface LoginUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  is_active: boolean;
  token_version: number;
  role: 'user' | 'admin' | 'moderator' | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, password' },
        { status: 400 }
      );
    }

    // Fetch user + role from database
    const user = await dbQueryOne<LoginUser>(
      `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active, u.token_version, ur.role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const userRole = user.role ?? 'user';

    // Generate JWT token
    const token = generateToken(user.id, user.email, userRole, user.token_version);

    // Create response with auth cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
          },
          token,
          role: userRole,
        },
      },
      { status: 200 }
    );

    // Set auth cookie
    response.headers.set('Set-Cookie', createAuthCookie(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
