#!/usr/bin/env node
// Standalone OCR worker — called via child_process to avoid Next.js/Tesseract conflicts
// Usage: node scripts/ocr-worker.js <imagePath>
// Output: JSON to stdout

const imagePath = process.argv[2];
if (!imagePath) {
  console.log(JSON.stringify({ error: 'No image path provided' }));
  process.exit(1);
}

async function run() {
  try {
    const ext = require('path').extname(imagePath).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      text = await ocrPdf(imagePath);
    } else {
      text = await runTesseract(imagePath);
    }

    console.log(JSON.stringify({ text }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

// Render each PDF page to a PNG buffer and OCR them, concatenating results.
async function ocrPdf(pdfPath) {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Try text extraction first — fast path for PDFs with an embedded text layer
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length >= 50) {
      return data.text;
    }
  } catch { /* fall through to image render */ }

  // Render PDF pages to PNG images using pdf-to-img, then OCR each page
  const { pdf: pdfToImg } = await import('pdf-to-img');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-pdf-'));
  const pageTexts = [];

  try {
    let pageNum = 1;
    for await (const pageBuffer of await pdfToImg(pdfPath, { scale: 2 })) {
      const pngPath = path.join(tmpDir, `page-${pageNum}.png`);
      fs.writeFileSync(pngPath, pageBuffer);
      const pageText = await runTesseract(pngPath);
      pageTexts.push(pageText);
      pageNum++;
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  return pageTexts.join('\n');
}

async function runTesseract(filePath) {
  const Tesseract = require('tesseract.js');
  const worker = await Tesseract.createWorker('eng', 1, { logger: () => {} });
  try {
    const { data } = await worker.recognize(filePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

run();
