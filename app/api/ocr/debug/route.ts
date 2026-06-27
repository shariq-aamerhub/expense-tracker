import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOADS_DIR } from '@/lib/data';
import { extractTextFromFile, parseReceiptText } from '@/lib/ocr';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const arrayBuffer = await req.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileName = req.headers.get('x-filename') || 'upload.jpg';
    const ext = path.extname(fileName).toLowerCase() || '.jpg';
    const filePath = path.join(UPLOADS_DIR, `debug-${uuidv4()}${ext}`);

    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(filePath, fileBuffer);

    const rawText = await extractTextFromFile(filePath);
    const parsed = parseReceiptText(rawText);

    await unlink(filePath).catch(() => {});

    return NextResponse.json({ rawText, parsed }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
