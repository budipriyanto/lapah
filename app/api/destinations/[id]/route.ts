import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQueryOne } from '@/utils/db';
import { requireAdmin } from '@/utils/auth/rbac';
import { v4 as uuidv4 } from 'uuid';
import type { DestinationImage } from '@/utils/types';
import { filterExistingImages, normalizeImages } from '@/utils/images';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Get destination by ID or slug
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const destination = await dbQueryOne(
      `SELECT * FROM destinations WHERE id = ? OR slug = ?`,
      [id, id]
    );

    if (!destination) {
      return NextResponse.json({ success: false, error: 'Destination not found' }, { status: 404 });
    }

    // Fetch images (hanya yang filanya benar-benar ada)
    const images = filterExistingImages(
      await dbQuery<DestinationImage[]>(
        'SELECT * FROM destination_images WHERE destination_id = ? ORDER BY image_order',
        [destination.id]
      )
    );

    return NextResponse.json({ success: true, data: { ...destination, images } });
  } catch (error) {
    console.error('Destination fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch destination' }, { status: 500 });
  }
}

// PATCH: Update destination (admin)
export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const data = await req.json();
    const { title, slug, category, subcategory, description, location, address, latitude, longitude, price_range, opening_hours, contact_phone } = data;

    if (!title || !slug || !category) {
      return NextResponse.json(
        { success: false, error: 'title, slug, and category are required' },
        { status: 400 }
      );
    }

    await dbQuery(
      'UPDATE destinations SET title = ?, slug = ?, category = ?, subcategory = ?, description = ?, location = ?, address = ?, latitude = ?, longitude = ?, price_range = ?, opening_hours = ?, contact_phone = ? WHERE id = ?',
      [title, slug, category, subcategory ?? null, description ?? null, location ?? null, address ?? null, latitude ?? null, longitude ?? null, price_range ?? null, opening_hours ?? null, contact_phone ?? null, id]
    );

    // Ganti semua gambar bila field images dikirim (delete-all + re-insert)
    if (Array.isArray(data.images)) {
      await dbQuery('DELETE FROM destination_images WHERE destination_id = ?', [id]);
      const images = normalizeImages(data.images);
      for (const img of images) {
        await dbQuery(
          'INSERT INTO destination_images (id, destination_id, image_url, is_hero, image_order) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), id, img.image_url, img.is_hero, img.image_order]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Destination update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE: Delete destination (admin)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    await dbQuery('DELETE FROM destinations WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Destination delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}