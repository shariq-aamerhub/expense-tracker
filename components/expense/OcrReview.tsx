'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { OcrParsedBill, OcrLineItem } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface OcrReviewProps {
  parsed: OcrParsedBill;
  onChange: (updated: OcrParsedBill) => void;
  onNext: () => void;
  onBack: () => void;
  isManual?: boolean;
}

export default function OcrReview({ parsed, onChange, onNext, onBack, isManual }: OcrReviewProps) {
  const [showRaw, setShowRaw] = useState(false);

  function updateField<K extends keyof OcrParsedBill>(key: K, value: OcrParsedBill[K]) {
    onChange({ ...parsed, [key]: value });
  }

  function updateItem(idx: number, field: keyof OcrLineItem, value: string | number) {
    const items = [...parsed.lineItems];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'total') {
      items[idx].unitPrice = Number(value);
      items[idx].qty = 1;
    }
    onChange({ ...parsed, lineItems: items });
  }

  function addItem() {
    const newItem: OcrLineItem = { name: '', qty: 1, unitPrice: 0, total: 0 };
    onChange({ ...parsed, lineItems: [...parsed.lineItems, newItem] });
  }

  function removeItem(idx: number) {
    const items = parsed.lineItems.filter((_, i) => i !== idx);
    onChange({ ...parsed, lineItems: items });
  }

  const itemsTotal = parsed.lineItems.reduce((s, item) => s + Number(item.total), 0);

  return (
    <div className="space-y-5">
      {!isManual && parsed.rawText && (
        <div>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-brand-600 hover:underline"
          >
            {showRaw ? 'Hide' : 'Show'} raw OCR text
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
              {parsed.rawText}
            </pre>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Merchant / Shop"
          value={parsed.merchant}
          onChange={(e) => updateField('merchant', e.target.value)}
          placeholder="e.g. Big Bazaar"
        />
        <Input
          label="Bill Date"
          type="date"
          value={parsed.date}
          onChange={(e) => updateField('date', e.target.value)}
        />
      </div>

      <div>
        <Input
          label="Bill Total (AED)"
          type="number"
          min="0"
          step="0.01"
          value={parsed.total ?? ''}
          onChange={(e) => updateField('total', e.target.value ? Number(e.target.value) : null)}
          placeholder="0.00"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
          <Button variant="ghost" size="sm" onClick={addItem}>+ Add Item</Button>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-right px-3 py-2 w-28">Price</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsed.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-gray-400 text-sm">
                      No items detected. Add items manually.
                    </td>
                  </tr>
                )}
                {parsed.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-1.5">
                      <input
                        className="w-full text-sm border-0 focus:outline-none focus:ring-1 focus:ring-brand-400 rounded px-1"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 text-sm text-right border-0 focus:outline-none focus:ring-1 focus:ring-brand-400 rounded px-1"
                        value={item.total}
                        onChange={(e) => updateItem(idx, 'total', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {parsed.lineItems.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                      Items subtotal
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                      AED {itemsTotal.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {parsed.total !== null && parsed.lineItems.length > 0 && Math.abs(itemsTotal - (parsed.total ?? 0)) > 0.5 && (
          <p className="mt-2 text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2">
            Items total (AED {itemsTotal.toFixed(2)}) differs from bill total (AED {parsed.total?.toFixed(2)}). You may have missing items.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">Back</Button>
        <Button
          onClick={onNext}
          className="flex-1"
          disabled={!parsed.merchant || !parsed.date}
        >
          Next: Classify Items
        </Button>
      </div>
    </div>
  );
}
