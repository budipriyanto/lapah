import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/utils/db';
import { requireAdmin } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';
import type { Event, EventImage } from '@/utils/types';
import { filterExistingImages, normalizeImages } from '@/utils/images';

type EventWithImages = Event & { images?: EventImage[] };

// GET: List all events (with images)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit');

    let sql = 'SELECT * FROM events ORDER BY date_start DESC';
    if (limit) {
      const n = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      sql += ` LIMIT ${n}`;
    }

    const events = await dbQuery<EventWithImages[]>(sql);

    if (events.length > 0) {
      const ids = events.map((e) => e.id);
      const placeholders = ids.map(() => '?').join(', ');
      const images = filterExistingImages(
        await dbQuery<EventImage[]>(
          `SELECT * FROM event_images WHERE event_id IN (${placeholders}) ORDER BY image_order`,
          ids
        )
      );

      const imagesByEvent = new Map<string, EventImage[]>();
      for (const img of images) {
        const list = imagesByEvent.get(img.event_id);
        if (list) {
          list.push(img);
        } else {
          imagesByEvent.set(img.event_id, [img]);
        }
      }

      for (const e of events) {
        e.images = imagesByEvent.get(e.id) ?? [];
      }
    }

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST: Create event (admin)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    if (!data.title || !data.slug || !data.date_start) {
      return NextResponse.json(
        { success: false, error: 'title, slug, and date_start are required' },
        { status: 400 }
      );
    }
    const id = uuidv4();
    await dbQuery(
      'INSERT INTO events (id, title, slug, location, description, date_start, date_end, time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.title, data.slug, data.location ?? null, data.description ?? null, data.date_start, data.date_end ?? null, data.time ?? null, auth.userId]
    );

    // Simpan gambar (opsional): [{ image_url|url, is_hero }]
    const images = normalizeImages(data.images);
    for (const img of images) {
      await dbQuery(
        'INSERT INTO event_images (id, event_id, image_url, is_hero, image_order) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), id, img.image_url, img.is_hero, img.image_order]
      );
    }

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    console.error('Event create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
  }
}
