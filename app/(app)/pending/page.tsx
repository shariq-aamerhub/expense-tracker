'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Group, Expense, PublicUser } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import BillPreview from '@/components/expense/BillPreview';
import { useToast } from '@/components/ui/Toast';

export default function PendingPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/groups')
      .then((r) => r.json())
      .then((data: Group[]) => {
        setGroups(data);
        if (data.length > 0) setSelectedGroupId(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedGroupId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/groups/${selectedGroupId}`).then((r) => r.json()),
      fetch(`/api/expenses?groupId=${selectedGroupId}&status=pending`).then((r) => r.json()),
    ])
      .then(([group, exps]) => {
        setMembers(group.members || []);
        setExpenses((exps as Expense[]).filter((e) => e.status === 'pending'));
      })
      .finally(() => setLoading(false));
  }, [selectedGroupId]);

  function getMemberName(userId: string) {
    return members.find((m) => m.id === userId)?.name || 'Unknown';
  }

  async function handleDelete(e: React.MouseEvent, expenseId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this expense?')) return;
    setDeletingId(expenseId);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setExpenses((prev) => prev.filter((ex) => ex.id !== expenseId));
      showToast('Expense deleted', 'success');
    } catch {
      showToast('Failed to delete expense', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pending Approval</h1>
        <Button onClick={() => router.push('/expenses/new')} size="sm">
          + Add
        </Button>
      </div>

      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupId(g.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGroupId === g.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-brand-600" /></div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No expenses waiting for approval</p>
          </div>
          <Button onClick={() => router.push('/expenses/new')} variant="secondary" size="sm">
            Add Expense
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} waiting for classification</p>
          {expenses.map((expense) => (
            <div
              key={expense.id}
              onClick={() => router.push(`/expenses/${expense.id}/approve`)}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail — stopPropagation so click doesn't navigate */}
                {expense.billImagePath ? (
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <BillPreview
                      src={expense.billImagePath}
                      thumbnailClassName="w-12 h-12 rounded-lg bg-gray-100"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {expense.description || expense.merchant || 'Unnamed expense'}
                      </p>
                      {expense.description && expense.merchant && (
                        <p className="text-xs text-gray-400 truncate">{expense.merchant}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      AED {expense.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-500">
                      Paid by <span className="font-medium text-gray-700">{getMemberName(expense.paidBy)}</span>
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{expense.billDate}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Pending
                  </span>
                  {expense.lineItems.length > 0 && (
                    <span className="text-xs text-gray-400">{expense.lineItems.length} items</span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(e, expense.id)}
                  disabled={deletingId === expense.id}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                  aria-label="Delete expense"
                >
                  {deletingId === expense.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
