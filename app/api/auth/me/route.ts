import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth/rbac';
import { dbQueryOne } from '@/utils/db';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Require authentication (JWT from cookie)
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }
    const userPayload = authResult;

    // Fetch real user details from database
    const user = await dbQueryOne<UserProfile>(
      'SELECT id, email, full_name, avatar_url FROM users WHERE id = ?',
      [userPayload.userId]
    );

    if (!user) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
          },
          role: userPayload.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
