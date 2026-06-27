'use client';

import { useRef, useState } from 'react';
import type { OcrParsedBill } from '@/lib/types';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface BillUploadProps {
  onOcrComplete: (result: OcrParsedBill, filePath: string) => void;
  onSkipOcr: () => void;
}

export default function BillUpload({ onOcrComplete, onSkipOcr }: BillUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const MAX_SIZE = 10 * 1024 * 1024;

  async function processFile(file: File) {
    if (file.size > MAX_SIZE) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }

    setFileName(file.name);
    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);

      let res: Response;
      try {
        res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'x-filename': file.name, 'Content-Type': file.type || 'application/octet-stream' },
          body: arrayBuffer,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) throw new Error('OCR failed');

      const data = await res.json();
      onOcrComplete(data.parsed, data.filePath);
    } catch (err) {
      const msg = err instanceof Error && err.name === 'AbortError'
        ? 'OCR timed out. Please enter details manually.'
        : 'OCR processing failed. You can enter details manually.';
      showToast(msg, 'error');
      onSkipOcr();
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}
          ${isProcessing ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-600">Processing bill with OCR...</p>
            <p className="text-xs text-gray-400">This can take 10–30 seconds</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Bill preview" className="max-h-48 rounded-lg object-contain" />
            <p className="text-sm text-gray-500">{fileName}</p>
            <p className="text-xs text-gray-400">Click to change file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Upload bill or receipt</p>
              <p className="text-xs text-gray-400 mt-1">Drag & drop or tap to browse</p>
              <p className="text-xs text-gray-400">JPEG, PNG, PDF up to 10MB</p>
            </div>
            {fileName && <p className="text-xs text-brand-600">{fileName}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <Button variant="secondary" fullWidth onClick={onSkipOcr}>
        Enter bill details manually
      </Button>
    </div>
  );
}
