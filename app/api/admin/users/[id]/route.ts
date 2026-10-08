import { NextRequest, NextResponse } from 'next/server';
import pool, { dbQueryOne } from '@/utils/db';
import { requireSuperadmin } from '@/utils/auth/rbac';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_ROLES = ['user', 'admin', 'moderator'] as const;

// PATCH: Ubah role dan/atau status aktif pengguna (superadmin only)
export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireSuperadmin(req);
  if (auth instanceof NextResponse) return auth;

  let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { role, isActive } = body;

    if (role === undefined && isActive === undefined) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update: provide role and/or isActive' },
        { status: 400 }
      );
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    if (id === auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify your own account' },
        { status: 400 }
      );
    }

    const target = await dbQueryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    if (!target) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (role !== undefined) {
      await connection.execute(
        `INSERT INTO user_roles (id, user_id, role, assigned_by, assigned_at)
         VALUES (UUID(), ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           role = VALUES(role),
           assigned_by = VALUES(assigned_by),
           assigned_at = CURRENT_TIMESTAMP`,
        [id, role, auth.userId]
      );
    }

    if (isActive !== undefined) {
      await connection.execute(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive ? 1 : 0, id]
      );
    }

    // Hanguskan semua sesi aktif target -> wajib login ulang dengan role/status terbaru
    await connection.execute(
      'UPDATE users SET token_version = token_version + 1 WHERE id = ?',
      [id]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      data: { id, role: role ?? null, is_active: isActive ?? null },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback failure
      }
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
