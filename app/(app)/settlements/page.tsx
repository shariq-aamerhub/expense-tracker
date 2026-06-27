'use client';

import { useEffect, useState } from 'react';
import type { Group, PublicUser } from '@/lib/types';
import { getCurrentMonth, formatMonth, formatCurrency } from '@/lib/calculations';
import SettlementForm from '@/components/statement/SettlementForm';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

interface Settlement {
  id: string;
  groupId: string;
  month: string;
  paidBy: string;
  receivedBy: string;
  amount: number;
  date: string;
  note: string;
  createdAt: string;
}

export default function SettlementsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
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
    if (!selectedGroupId) return;
    fetch(`/api/groups/${selectedGroupId}`)
      .then((r) => r.json())
      .then((g) => setMembers(g.members || []));
  }, [selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoading(true);
    fetch(`/api/settlements?groupId=${selectedGroupId}&month=${month}`)
      .then((r) => r.json())
      .then(setSettlements)
      .finally(() => setLoading(false));
  }, [selectedGroupId, month]);

  function memberName(id: string) {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  }

  async function deleteSettlement(id: string) {
    if (!confirm('Delete this settlement?')) return;
    try {
      const res = await fetch(`/api/settlements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setSettlements(settlements.filter((s) => s.id !== id));
      showToast('Settlement deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Settlements</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>+ Add</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {groups.length > 1 && (
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          No settlements for {formatMonth(month)}
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{memberName(s.paidBy)}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">{memberName(s.receivedBy)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.date}{s.note ? ` · ${s.note}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-green-600">{formatCurrency(s.amount)}</span>
                  <button
                    onClick={() => deleteSettlement(s.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Record Settlement">
        {members.length > 0 && (
          <SettlementForm
            groupId={selectedGroupId}
            month={month}
            members={members}
            onSettled={() => {
              setShowForm(false);
              fetch(`/api/settlements?groupId=${selectedGroupId}&month=${month}`)
                .then((r) => r.json())
                .then(setSettlements);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </Modal>
    </div>
  );
}
