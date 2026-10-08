import { NextRequest, NextResponse } from 'next/server';
import { dbQueryOne } from '@/utils/db';
import { requireAdmin } from '@/utils/auth/rbac';

interface AdminStats {
  wisata: number;
  kuliner: number;
  penginapan: number;
  events: number;
  ulasan: number;
  users: number;
}

const EMPTY_STATS: AdminStats = {
  wisata: 0,
  kuliner: 0,
  penginapan: 0,
  events: 0,
  ulasan: 0,
  users: 0,
};

// GET: Statistik dashboard admin (jumlah per kategori + events + ulasan + users)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await dbQueryOne<AdminStats>(
      `SELECT
        (SELECT COUNT(*) FROM destinations WHERE category = 'wisata') AS wisata,
        (SELECT COUNT(*) FROM destinations WHERE category = 'kuliner') AS kuliner,
        (SELECT COUNT(*) FROM destinations WHERE category = 'penginapan') AS penginapan,
        (SELECT COUNT(*) FROM events) AS events,
        (SELECT COUNT(*) FROM reviews) AS ulasan,
        (SELECT COUNT(*) FROM users) AS users`
    );

    return NextResponse.json({ success: true, data: stats ?? EMPTY_STATS });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
