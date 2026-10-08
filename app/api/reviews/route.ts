import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/utils/db';
import { requireAdmin, requireAuth } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';

async function recomputeDestinationRating(destinationId: string) {
  await dbQuery(
    `UPDATE destinations SET
      review_count = (SELECT COUNT(*) FROM reviews WHERE destination_id = ? AND status = 'approved'),
      rating_avg = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE destination_id = ? AND status = 'approved'), 0)
     WHERE id = ?`,
    [destinationId, destinationId, destinationId]
  );
}

// GET: List reviews (public, approved) atau own (?mine=1) atau semua (?all=1, admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get('destinationId');
    const mine = searchParams.get('mine');
    const all = searchParams.get('all');

    if (mine) {
      const auth = await requireAuth(req);
      if (auth instanceof NextResponse) return auth;

      const reviews = await dbQuery(
        `SELECT r.*, d.title AS dest_title, d.slug AS dest_slug
         FROM reviews r
         JOIN destinations d ON d.id = r.destination_id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
        [auth.userId]
      );
      return NextResponse.json({ success: true, data: reviews });
    }

    // ?all=1: admin melihat semua ulasan tanpa filter status (untuk halaman admin)
    if (all) {
      const auth = await requireAdmin(req);
      if (auth instanceof NextResponse) return auth;
    }

    const conditions: string[] = [];
    const params: string[] = [];

    if (!all) {
      conditions.push(`r.status = 'approved'`);
    }
    if (destinationId) {
      conditions.push('r.destination_id = ?');
      params.push(destinationId);
    }

    // ?all=1 menyertakan nama asli user dari DB (untuk panel admin/moderator)
    let sql = `SELECT r.*, d.title AS dest_title, d.slug AS dest_slug`;
    if (all) {
      sql += `, u.full_name AS real_name`;
    }
    sql += ` FROM reviews r JOIN destinations d ON d.id = r.destination_id`;
    if (all) {
      sql += ` LEFT JOIN users u ON u.id = r.user_id`;
    }
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY r.created_at DESC';

    const reviews = await dbQuery(sql, params);
    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST: Submit review (auth) — langsung approved (tanpa moderasi, ikut referensi)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    const { destinationId, rating, comment, userName } = data;

    if (!destinationId || typeof destinationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Destinasi tidak valid' },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating harus antara 1 sampai 5' },
        { status: 400 }
      );
    }

    const destination = await dbQueryOne<{ id: string }>(
      'SELECT id FROM destinations WHERE id = ?',
      [destinationId]
    );
    if (!destination) {
      return NextResponse.json(
        { success: false, error: 'Destinasi tidak ditemukan' },
        { status: 404 }
      );
    }

    const id = uuidv4();
    const text = typeof comment === 'string' ? comment.trim() : '';
    const name = typeof userName === 'string' ? userName.trim() : '';
    await dbQuery(
      'INSERT INTO reviews (id, destination_id, user_id, user_name, rating, comment, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, destinationId, auth.userId, name || 'Anonymous', rating, text || null, 'approved']
    );
    await recomputeDestinationRating(destinationId);
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 });
  }
}

// DELETE: Hapus ulasan sendiri (auth) — admin boleh hapus ulasan siapa pun
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Review id is required' }, { status: 400 });
    }

    const isAdmin = auth.role === 'admin';
    const existing = await dbQueryOne<{ destination_id: string }>(
      isAdmin
        ? 'SELECT destination_id FROM reviews WHERE id = ?'
        : 'SELECT destination_id FROM reviews WHERE id = ? AND user_id = ?',
      isAdmin ? [id] : [id, auth.userId]
    );

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Review not found' }, { status: 404 });
    }

    await dbQuery(
      isAdmin ? 'DELETE FROM reviews WHERE id = ?' : 'DELETE FROM reviews WHERE id = ? AND user_id = ?',
      isAdmin ? [id] : [id, auth.userId]
    );
    await recomputeDestinationRating(existing.destination_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Review delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete review' }, { status: 500 });
  }
}
