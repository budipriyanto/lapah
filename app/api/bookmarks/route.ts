import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/utils/db';
import { requireAuth } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';

// GET: List user bookmarks (auth)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const bookmarks = await dbQuery(
      `SELECT b.*, d.title, d.slug, d.category, d.location, d.rating_avg,
              (SELECT image_url FROM destination_images di WHERE di.destination_id = d.id AND di.is_hero = true LIMIT 1) as image_url
       FROM bookmarks b
       JOIN destinations d ON b.destination_id = d.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [auth.userId]
    );

    return NextResponse.json({ success: true, data: bookmarks });
  } catch (error) {
    console.error('Bookmarks fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

// POST: Add bookmark (auth)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    const { destinationId } = data;

    if (!destinationId) {
      return NextResponse.json({ success: false, error: 'Destination ID required' }, { status: 400 });
    }

    // Check if already bookmarked
    const existing = await dbQueryOne(
      'SELECT * FROM bookmarks WHERE user_id = ? AND destination_id = ?',
      [auth.userId, data.destinationId]
    );

    if (existing) {
      return NextResponse.json({ success: false, error: 'Already bookmarked' }, { status: 409 });
    }

    const id = uuidv4();
    await dbQuery(
      'INSERT INTO bookmarks (id, user_id, destination_id) VALUES (?, ?, ?)',
      [id, auth.userId, data.destinationId]
    );

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    console.error('Bookmark create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to bookmark' }, { status: 500 });
  }
}

// DELETE: Remove bookmark (auth)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get('destinationId');

    if (!destinationId) {
      return NextResponse.json({ success: false, error: 'Destination ID required' }, { status: 400 });
    }

    await dbQuery(
      'DELETE FROM bookmarks WHERE user_id = ? AND destination_id = ?',
      [auth.userId, destinationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookmark delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove bookmark' }, { status: 500 });
  }
}