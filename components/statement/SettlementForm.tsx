'use client';

import { useState } from 'react';
import type { PublicUser } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';

interface SettlementFormProps {
  groupId: string;
  month: string;
  members: PublicUser[];
  onSettled: () => void;
  onCancel: () => void;
}

export default function SettlementForm({ groupId, month, members, onSettled, onCancel }: SettlementFormProps) {
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');
  const [receivedBy, setReceivedBy] = useState(members[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidBy || !receivedBy || !amount || !date) return;
    if (paidBy === receivedBy) {
      showToast('Payer and receiver must be different', 'error');
      return;
    }
    if (Number(amount) <= 0) {
      showToast('Amount must be positive', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, month, paidBy, receivedBy, amount: Number(amount), date, note }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast('Settlement recorded', 'success');
      onSettled();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Paid by"
        options={memberOptions}
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
      />
      <Select
        label="Received by"
        options={memberOptions}
        value={receivedBy}
        onChange={(e) => setReceivedBy(e.target.value)}
      />
      <Input
        label="Amount (AED)"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        required
      />
      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. UPI transfer"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1" loading={loading}>Record Settlement</Button>
      </div>
    </form>
  );
}
