'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { OcrParsedBill, PublicUser, Group } from '@/lib/types';
import BillUpload from '@/components/expense/BillUpload';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import MerchantInput from '@/components/ui/MerchantInput';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

interface DraftLineItem {
  id: string;
  name: string;
  price: string;
}

function emptyItem(): DraftLineItem {
  return { id: uuidv4(), name: '', price: '' };
}

function NewExpenseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(searchParams.get('groupId') || '');
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [billImagePath, setBillImagePath] = useState<string | null>(null);
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((data: Group[]) => {
        setGroups(data);
        if (!selectedGroupId && data.length > 0) setSelectedGroupId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingMembers(true);
    fetch(`/api/groups/${selectedGroupId}`)
      .then((r) => r.json())
      .then((g) => {
        setMembers(g.members || []);
        setPaidBy((prev) => prev || g.members?.[0]?.id || '');
      })
      .finally(() => setLoadingMembers(false));
  }, [selectedGroupId]);

  function handleOcrComplete(result: OcrParsedBill, filePath: string) {
    setBillImagePath(filePath);
    setOcrRawText(result.rawText || null);
    if (result.total != null) setAmount(String(result.total));
    if (result.merchant) setMerchant(result.merchant);
    if (result.date) setDate(result.date);
    // Pre-populate line items from OCR
    if (result.lineItems && result.lineItems.length > 0) {
      setLineItems(result.lineItems.map((item) => ({
        id: uuidv4(),
        name: item.name,
        price: String(item.total ?? (item.qty * item.unitPrice)),
      })));
    }
    setUploadDone(true);
  }

  function handleSkipOcr() {
    setUploadDone(true);
  }

  function updateItem(id: string, field: keyof DraftLineItem, value: string) {
    setLineItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function removeItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    setLineItems((prev) => [...prev, emptyItem()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId || !paidBy) {
      showToast('Please select a group and payer', 'error');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    // Convert draft line items to proper format, skip blank rows
    const validLineItems = lineItems
      .filter((item) => item.name.trim() && item.price)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        qty: 1,
        unitPrice: parseFloat(item.price) || 0,
        total: parseFloat(item.price) || 0,
        type: 'common' as const,
        responsibleMemberId: null,
        participantIds: [],
        category: '',
      }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          billDate: date,
          merchant: merchant.trim() || 'Unknown',
          description: description.trim(),
          billImagePath,
          ocrRawText,
          totalAmount: parsedAmount,
          paidBy,
          lineItems: validLineItems,
          itemCount: validLineItems.length || null,
          status: 'pending',
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);

      showToast('Expense saved! Pending approval.', 'success');
      router.push('/pending');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save expense', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Add Expense</h1>
      </div>

      {groups.length === 0 && (
        <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
          You need to create a group first.{' '}
          <button onClick={() => router.push('/groups')} className="underline font-medium">Create Group</button>
        </div>
      )}

      {groups.length > 1 && (
        <Select
          label="Group"
          options={groups.map((g) => ({ value: g.id, label: g.name }))}
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        />
      )}

      {loadingMembers && (
        <div className="flex justify-center py-4"><Spinner className="text-brand-600" /></div>
      )}

      {!loadingMembers && selectedGroupId && members.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bill upload */}
          {!uploadDone ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Upload Bill (optional)</p>
              <BillUpload onOcrComplete={handleOcrComplete} onSkipOcr={handleSkipOcr} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              {billImagePath && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bill uploaded — details auto-filled from receipt
                  <button
                    type="button"
                    onClick={() => { setUploadDone(false); setBillImagePath(null); setOcrRawText(null); setLineItems([]); }}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <MerchantInput
                value={merchant}
                onChange={setMerchant}
              />

              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <Input
                label="Description (optional)"
                placeholder="e.g. Weekly groceries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Select
                label="Paid by"
                options={members.map((m) => ({ value: m.id, label: m.name }))}
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              />
            </div>
          )}

          {/* Line items editor — shown after upload or skip */}
          {uploadDone && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
                  {lineItems.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{lineItems.length} items from receipt</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add item
                </button>
              </div>

              {lineItems.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No items yet — add manually or upload a bill to auto-fill
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_80px_28px] gap-2 px-1">
                    <span className="text-xs text-gray-400 font-medium">Item</span>
                    <span className="text-xs text-gray-400 font-medium text-right">Price</span>
                    <span />
                  </div>
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_28px] gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Item name"
                        className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center px-1">
                    <span className="text-xs text-gray-500">{lineItems.filter(i => i.name.trim()).length} items</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {lineItems
                        .filter(i => i.name.trim() && i.price)
                        .reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0)
                        .toFixed(2)
                      } AED
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadDone && (
            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Saving...' : 'Save & Add to Pending'}
            </Button>
          )}
        </form>
      )}
    </div>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>}>
      <NewExpenseContent />
    </Suspense>
  );
}
