'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

interface BillPreviewProps {
  src: string;
  thumbnailClassName?: string;
}

function isPdf(src: string) {
  return src.toLowerCase().includes('.pdf') || src.toLowerCase().endsWith('pdf');
}

function BillViewer({ src }: { src: string }) {
  if (isPdf(src)) {
    return (
      <iframe
        src={src}
        className="w-full rounded-lg border border-gray-100"
        style={{ height: '75vh' }}
        title="Bill PDF"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Bill" className="w-full rounded-lg object-contain" />;
}

export default function BillPreview({ src, thumbnailClassName }: BillPreviewProps) {
  const [open, setOpen] = useState(false);

  const thumb = isPdf(src) ? (
    <div className={`${thumbnailClassName} bg-red-50 flex items-center justify-center cursor-pointer`}>
      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
      </svg>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Bill" className={`${thumbnailClassName} cursor-pointer object-cover`} />
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg"
        aria-label="View bill"
      >
        {thumb}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="lg">
        <BillViewer src={src} />
      </Modal>
    </>
  );
}

// Inline viewer (no modal) for full-page contexts like the approve page
export function BillInline({ src }: { src: string }) {
  const [showPdf, setShowPdf] = useState(false);

  if (isPdf(src)) {
    return (
      <div>
        {showPdf ? (
          <>
            <iframe
              src={src}
              className="w-full rounded-lg border border-gray-100"
              style={{ height: '70vh' }}
              title="Bill PDF"
            />
            <button
              onClick={() => setShowPdf(false)}
              className="mt-2 text-xs text-gray-500 hover:underline"
            >
              Hide
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
            <svg className="w-8 h-8 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6M9 17h4" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">PDF Bill attached</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPdf(true)}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50"
              >
                Preview
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Open
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Bill" className="w-full max-h-96 object-contain rounded-lg" />
  );
}
