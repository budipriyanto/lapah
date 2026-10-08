import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/utils/db';
import { requireAdmin } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';
import type { EventImage } from '@/utils/types';
import { filterExistingImages, normalizeImages } from '@/utils/images';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Get event by ID or slug
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const event = await dbQueryOne(
      'SELECT * FROM events WHERE id = ? OR slug = ?',
      [id, id]
    );

    if (!event) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    // Fetch images (hanya yang filanya benar-benar ada)
    const images = filterExistingImages(
      await dbQuery<EventImage[]>(
        'SELECT * FROM event_images WHERE event_id = ? ORDER BY image_order',
        [event.id]
      )
    );

    return NextResponse.json({ success: true, data: { ...event, images } });
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PATCH: Update event (admin)
export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const data = await req.json();
    const { title, slug, location, description, date_start, date_end, time } = data;

    if (!title || !slug || !date_start) {
      return NextResponse.json(
        { success: false, error: 'title, slug, and date_start are required' },
        { status: 400 }
      );
    }

    await dbQuery(
      'UPDATE events SET title = ?, slug = ?, location = ?, description = ?, date_start = ?, date_end = ?, time = ? WHERE id = ?',
      [title, slug, location ?? null, description ?? null, date_start, date_end ?? null, time ?? null, id]
    );

    // Ganti semua gambar bila field images dikirim (delete-all + re-insert)
    if (Array.isArray(data.images)) {
      await dbQuery('DELETE FROM event_images WHERE event_id = ?', [id]);
      const images = normalizeImages(data.images);
      for (const img of images) {
        await dbQuery(
          'INSERT INTO event_images (id, event_id, image_url, is_hero, image_order) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), id, img.image_url, img.is_hero, img.image_order]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE: Delete event (admin)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    await dbQuery('DELETE FROM events WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}