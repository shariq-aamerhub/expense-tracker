import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOADS_DIR } from '@/lib/data';
import { extractTextFromImage, extractTextFromPdf, parseReceiptText } from '@/lib/ocr';

export const maxDuration = 60;
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let fileName = 'upload.jpg';

    if (contentType.includes('multipart/form-data')) {
      // Parse multipart manually using formData
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name || 'upload.jpg';
    } else {
      // Accept raw binary body with filename in header as fallback
      const arrayBuffer = await req.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = req.headers.get('x-filename') || 'upload.jpg';
    }

    if (fileBuffer.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const ext = path.extname(fileName).toLowerCase() || '.jpg';
    const filename = `${uuidv4()}${ext}`;

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filePath = path.join(UPLOADS_DIR, filename);
    await writeFile(filePath, fileBuffer);

    let rawText = '';
    if (ext === '.pdf') {
      rawText = await extractTextFromPdf(filePath);
    } else {
      rawText = await extractTextFromImage(filePath);
    }

    const parsed = parseReceiptText(rawText);
    const relativePath = `/api/uploads/${filename}`;

    return NextResponse.json({ rawText, parsed, filePath: relativePath });
  } catch (err) {
    console.error('OCR error:', err);
    return NextResponse.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
