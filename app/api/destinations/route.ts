import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/utils/db';
import { requireAdmin } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';
import type { Destination, DestinationImage } from '@/utils/types';
import { filterExistingImages, normalizeImages } from '@/utils/images';

type DestinationWithImages = Destination & { images?: DestinationImage[] };

// GET: List all destinations (with stats + images)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

    let sql = `SELECT d.* FROM destinations d`;
    const params: string[] = [];

    if (category) {
      sql += ' WHERE d.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY d.title';

    if (limit) {
      const n = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
      sql += ` LIMIT ${n}`;
    }

    const destinations = await dbQuery<DestinationWithImages[]>(sql, params);

    if (destinations.length > 0) {
      const ids = destinations.map((d) => d.id);
      const placeholders = ids.map(() => '?').join(', ');
      const images = filterExistingImages(
        await dbQuery<DestinationImage[]>(
          `SELECT * FROM destination_images WHERE destination_id IN (${placeholders}) ORDER BY image_order`,
          ids
        )
      );

      const imagesByDestination = new Map<string, DestinationImage[]>();
      for (const img of images) {
        const list = imagesByDestination.get(img.destination_id);
        if (list) {
          list.push(img);
        } else {
          imagesByDestination.set(img.destination_id, [img]);
        }
      }

      for (const d of destinations) {
        d.images = imagesByDestination.get(d.id) ?? [];
      }
    }

    return NextResponse.json({ success: true, data: destinations });
  } catch (error) {
    console.error('Destinations fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch destinations' }, { status: 500 });
  }
}

// POST: Create destination (admin)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await req.json();
    if (!data.title || !data.slug || !data.category) {
      return NextResponse.json(
        { success: false, error: 'title, slug, and category are required' },
        { status: 400 }
      );
    }
    const id = uuidv4();
    await dbQuery(
      'INSERT INTO destinations (id, title, slug, category, subcategory, description, location, address, latitude, longitude, price_range, opening_hours, contact_phone, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.title, data.slug, data.category, data.subcategory ?? null, data.description ?? null, data.location ?? null, data.address ?? null, data.latitude ?? null, data.longitude ?? null, data.price_range ?? null, data.opening_hours ?? null, data.contact_phone ?? null, auth.userId]
    );

    // Simpan gambar (opsional): [{ image_url|url, is_hero }]
    const images = normalizeImages(data.images);
    for (const img of images) {
      await dbQuery(
        'INSERT INTO destination_images (id, destination_id, image_url, is_hero, image_order) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), id, img.image_url, img.is_hero, img.image_order]
      );
    }

    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (error) {
    console.error('Destination create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create destination' }, { status: 500 });
  }
}
