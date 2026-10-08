import { NextRequest, NextResponse } from 'next/server';
import { handleUpload } from '@/utils/file-upload';
import { requireAdmin } from '@/utils/auth/rbac';

export async function POST(req: NextRequest) {
  try {
    // Require admin role
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Baca body sekali, lalu teruskan ke handler
    const formData = await req.formData();
    const category = (formData.get('category') as 'destinations' | 'events') || 'destinations';

    // Use shared upload handler
    return await handleUpload(formData, category);
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload route failed' },
      { status: 500 }
    );
  }
}
