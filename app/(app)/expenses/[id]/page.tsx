'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Expense, PublicUser } from '@/lib/types';
import { formatCurrency } from '@/lib/calculations';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ billDate: '', merchant: '', description: '', totalAmount: '', paidBy: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(async (exp) => {
        setExpense(exp);
        const group = await fetch(`/api/groups/${exp.groupId}`).then((r) => r.json());
        setMembers(group.members || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function startEditing() {
    if (!expense) return;
    setEditForm({
      billDate: expense.billDate,
      merchant: expense.merchant,
      description: expense.description || '',
      totalAmount: String(expense.totalAmount),
      paidBy: expense.paidBy,
    });
    setEditing(true);
  }

  async function saveEdits() {
    if (!expense) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billDate: editForm.billDate,
          merchant: editForm.merchant,
          description: editForm.description,
          totalAmount: parseFloat(editForm.totalAmount),
          paidBy: editForm.paidBy,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setExpense(updated);
      setEditing(false);
      showToast('Expense updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense() {
    if (!confirm('Delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Expense deleted', 'success');
      router.push('/dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  function memberName(memberId: string) {
    return members.find((m) => m.id === memberId)?.name || 'Unknown';
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>;
  if (!expense) return <p className="text-gray-400 text-center py-16">Expense not found</p>;

  const canEdit = expense.status === 'submitted' || expense.status === 'draft';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{expense.merchant}</h1>
        <Badge variant={expense.status === 'submitted' ? 'green' : 'yellow'}>{expense.status}</Badge>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Details</h3>
          {canEdit && !editing && (
            <button onClick={startEditing} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={editForm.billDate}
                onChange={(e) => setEditForm((f) => ({ ...f, billDate: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Merchant</label>
              <input
                type="text"
                value={editForm.merchant}
                onChange={(e) => setEditForm((f) => ({ ...f, merchant: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Description</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Total Amount (AED)</label>
              <input
                type="number"
                step="0.01"
                value={editForm.totalAmount}
                onChange={(e) => setEditForm((f) => ({ ...f, totalAmount: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Paid by</label>
              <select
                value={editForm.paidBy}
                onChange={(e) => setEditForm((f) => ({ ...f, paidBy: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveEdits} loading={saving} className="flex-1">Save changes</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{expense.billDate}</span>
            </div>
            {expense.description && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Description</span>
                <span className="font-medium">{expense.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold">{formatCurrency(expense.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid by</span>
              <span className="font-medium">{memberName(expense.paidBy)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items ({expense.lineItems.length})</h3>
        {expense.lineItems.length === 0 ? (
          <p className="text-sm text-gray-400">No line items</p>
        ) : (
          <div className="space-y-2">
            {expense.lineItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name || 'Unnamed item'}</p>
                  <p className="text-xs text-gray-400">
                    {item.type === 'personal'
                      ? `Personal · ${memberName(item.responsibleMemberId!)}`
                      : `Common · split among ${item.participantIds.length}`
                    } · {item.category}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Share Breakdown</h3>
        <div className="space-y-2">
          {members.map((member) => {
            const share = expense.calculatedShares[member.id] || 0;
            return (
              <div key={member.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{member.name}</span>
                <span className="font-semibold">{formatCurrency(share)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {expense.status === 'draft' && (
        <Button variant="danger" size="sm" onClick={deleteExpense}>Delete Expense</Button>
      )}
    </div>
  );
}
