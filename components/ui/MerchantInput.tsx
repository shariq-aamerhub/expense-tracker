'use client';

import { useEffect, useRef, useState } from 'react';

interface MerchantInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MerchantInput({ value, onChange, placeholder }: MerchantInputProps) {
  const [allMerchants, setAllMerchants] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/merchants')
      .then((r) => r.json())
      .then(setAllMerchants)
      .catch(() => {});
  }, []);

  const suggestions =
    value.length === 0
      ? allMerchants
      : value.length < 2
      ? []
      : allMerchants.filter((m) => m.toLowerCase().includes(value.toLowerCase()));

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isOpen = focused && suggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant / Store</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder || "e.g. Max Mart, McDonald's"}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        autoComplete="off"
      />
      {isOpen && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s) => {
            const lower = value.toLowerCase();
            const idx = s.toLowerCase().indexOf(lower);
            return (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    setFocused(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {idx >= 0 ? (
                    <>
                      {s.slice(0, idx)}
                      <span className="font-semibold text-brand-600">{s.slice(idx, idx + value.length)}</span>
                      {s.slice(idx + value.length)}
                    </>
                  ) : s}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
