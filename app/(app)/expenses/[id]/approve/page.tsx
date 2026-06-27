'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import type { Expense, LineItem, PublicUser } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { BillInline } from '@/components/expense/BillPreview';

type SplitMode = 'equal' | 'custom';

export default function ApprovePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [paidBy, setPaidBy] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customSplit, setCustomSplit] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/expenses/${id}`).then((r) => r.json()),
    ]).then(([exp]: [Expense]) => {
      if (!exp || exp.status !== 'pending') {
        router.replace('/pending');
        return;
      }
      setExpense(exp);
      setPaidBy(exp.paidBy);
      setTotalAmount(String(exp.totalAmount));

      // Fetch group members
      fetch(`/api/groups/${exp.groupId}`)
        .then((r) => r.json())
        .then((g) => {
          const mems: PublicUser[] = g.members || [];
          setMembers(mems);

          // Initialize line items — prefer OCR items, then itemCount blank rows, then one default row
          if (exp.lineItems.length > 0) {
            setLineItems(
              exp.lineItems.map((item) => ({
                ...item,
                participantIds: item.participantIds.length > 0 ? item.participantIds : mems.map((m) => m.id),
              }))
            );
          } else if (exp.itemCount && exp.itemCount > 1) {
            setLineItems(
              Array.from({ length: exp.itemCount }, () => ({
                id: uuidv4(),
                name: '',
                qty: 1,
                unitPrice: 0,
                total: 0,
                type: 'common' as const,
                responsibleMemberId: null,
                participantIds: mems.map((m) => m.id),
                category: 'Others',
              }))
            );
          } else {
            setLineItems([{
              id: uuidv4(),
              name: exp.description || exp.merchant || 'Expense',
              qty: 1,
              unitPrice: exp.totalAmount,
              total: exp.totalAmount,
              type: 'common',
              responsibleMemberId: null,
              participantIds: mems.map((m) => m.id),
              category: 'Others',
            }]);
          }

          // Initialize equal custom split
          const eq: Record<string, string> = {};
          mems.forEach((m) => { eq[m.id] = String((100 / mems.length).toFixed(1)); });
          setCustomSplit(eq);
        })
        .finally(() => setLoading(false));
    });
  }, [id, router]);

  function updateItem(idx: number, updates: Partial<LineItem>) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...updates } : item)));
  }

  function toggleType(idx: number) {
    const item = lineItems[idx];
    const newType = item.type === 'common' ? 'personal' : 'common';
    updateItem(idx, {
      type: newType,
      responsibleMemberId: newType === 'personal' ? (members[0]?.id || null) : null,
      participantIds: newType === 'common' ? members.map((m) => m.id) : [],
    });
  }

  function toggleParticipant(idx: number, memberId: string) {
    const item = lineItems[idx];
    const participantIds = item.participantIds.includes(memberId)
      ? item.participantIds.filter((pid) => pid !== memberId)
      : [...item.participantIds, memberId];
    updateItem(idx, { participantIds });
  }

  function addManualItem() {
    setLineItems((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: '',
        qty: 1,
        unitPrice: 0,
        total: 0,
        type: 'common',
        responsibleMemberId: null,
        participantIds: members.map((m) => m.id),
        category: 'Others',
      },
    ]);
  }

  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleApprove() {
    const parsedTotal = parseFloat(totalAmount);
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (lineItems.length > 0) {
      const lineItemsTotal = lineItems.reduce((s, i) => s + i.total, 0);
      const diff = Math.abs(lineItemsTotal - parsedTotal);
      if (diff > 0.01) {
        showToast(
          `Line items total (AED ${lineItemsTotal.toFixed(2)}) must match bill total (AED ${parsedTotal.toFixed(2)}). Difference: AED ${diff.toFixed(2)}`,
          'error'
        );
        return;
      }
    }

    const splitRatio = splitMode === 'custom'
      ? Object.fromEntries(
          Object.entries(customSplit).map(([k, v]) => [k, parseFloat(v) || 0])
        )
      : {};

    setSubmitting(true);
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, paidBy, totalAmount: parsedTotal, splitRatio }),
      });

      if (!res.ok) throw new Error((await res.json()).error);

      showToast('Expense approved! Balances updated.', 'success');
      router.push('/dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to approve', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Expense deleted', 'success');
      router.push('/pending');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand-600" /></div>;
  }

  if (!expense) return null;

  const commonTotal = lineItems.filter((i) => i.type === 'common').reduce((s, i) => s + i.total, 0);
  const personalTotal = lineItems.filter((i) => i.type === 'personal').reduce((s, i) => s + i.total, 0);
  const lineItemsTotal = lineItems.reduce((s, i) => s + i.total, 0);
  const parsedBillTotal = parseFloat(totalAmount) || 0;
  const amountMismatch = lineItems.length > 0 && Math.abs(lineItemsTotal - parsedBillTotal) > 0.01;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Approve Expense</h1>
          <p className="text-xs text-gray-400 mt-0.5">{expense.description || expense.merchant || 'Unnamed'}</p>
        </div>
        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">Pending</span>
      </div>

      {/* Bill image / PDF */}
      {expense.billImagePath && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
          <BillInline src={expense.billImagePath} />
        </div>
      )}

      {/* Confirm amount & payer */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Confirm Details</h2>
        <Input
          label="Total Amount"
          type="number"
          step="0.01"
          min="0"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
        <Select
          label="Paid by"
          options={members.map((m) => ({ value: m.id, label: m.name }))}
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
        />
      </div>

      {/* Line item classification */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Classify Items</h2>
          <button
            onClick={addManualItem}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            + Add item
          </button>
        </div>

        {lineItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No items — tap "+ Add item" or use equal split below</p>
        )}

        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full text-sm border-b border-gray-200 focus:outline-none focus:border-brand-400 pb-0.5 text-gray-900"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      placeholder="Amount"
                      value={item.total || ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        updateItem(idx, { total: v, unitPrice: v });
                      }}
                    />
                    <button
                      onClick={() => toggleType(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                        item.type === 'common'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-orange-50 border-orange-300 text-orange-700'
                      }`}
                    >
                      {item.type === 'common' ? 'Common' : 'Personal'}
                    </button>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 mt-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {item.type === 'personal' && (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => updateItem(idx, { responsibleMemberId: member.id })}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        item.responsibleMemberId === member.id
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}

              {item.type === 'common' && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Split between:</p>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleParticipant(idx, member.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          item.participantIds.includes(member.id)
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                  {item.participantIds.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      AED {(item.total / item.participantIds.length).toFixed(2)} each
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {lineItems.length > 1 && (
          <div className="flex gap-4 bg-gray-50 rounded-xl p-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">Common</p>
              <p className="text-sm font-semibold text-blue-600">AED {commonTotal.toFixed(2)}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">Personal</p>
              <p className="text-sm font-semibold text-orange-600">AED {personalTotal.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Split ratio — only shown when no line items */}
      {lineItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Split</h2>
          <div className="flex gap-2">
            {(['equal', 'custom'] as SplitMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSplitMode(mode)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  splitMode === mode
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                {mode === 'equal' ? 'Equal split' : 'Custom %'}
              </button>
            ))}
          </div>

          {splitMode === 'custom' && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 flex-1">{m.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={customSplit[m.id] || ''}
                      onChange={(e) => setCustomSplit((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      className="w-16 text-sm border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Amount mismatch warning */}
      {amountMismatch && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="text-sm text-red-700">
            <span className="font-semibold">Amount mismatch: </span>
            Line items total <span className="font-medium">AED {lineItemsTotal.toFixed(2)}</span> must equal bill total <span className="font-medium">AED {parsedBillTotal.toFixed(2)}</span>
            {' '}(difference: AED {Math.abs(lineItemsTotal - parsedBillTotal).toFixed(2)})
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button fullWidth onClick={handleApprove} disabled={submitting || deleting || amountMismatch}>
          {submitting ? 'Approving...' : 'Approve & Update Balances'}
        </Button>
        <Button
          fullWidth
          variant="secondary"
          onClick={handleDelete}
          disabled={submitting || deleting}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          {deleting ? 'Deleting...' : 'Delete Expense'}
        </Button>
      </div>
    </div>
  );
}
