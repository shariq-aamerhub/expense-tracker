import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { UPLOADS_DIR } from '@/lib/data';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  // Prevent path traversal
  const filename = path.basename(params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
