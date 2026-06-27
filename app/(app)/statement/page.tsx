'use client';

import { useEffect, useState } from 'react';
import type { Group, Month, MonthStatement, PublicUser } from '@/lib/types';
import { getCurrentMonth, formatMonth } from '@/lib/calculations';
import MonthlyStatementComponent from '@/components/statement/MonthlyStatement';
import SettlementForm from '@/components/statement/SettlementForm';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

export default function StatementPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [months, setMonths] = useState<Month[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [statement, setStatement] = useState<(MonthStatement & { members: PublicUser[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
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
    fetch(`/api/months?groupId=${selectedGroupId}`)
      .then((r) => r.json())
      .then((data: Month[]) => {
        setMonths(data);
        const current = data.find((m) => m.month === month);
        setSelectedMonth(current || null);
      });
  }, [selectedGroupId, month]);

  useEffect(() => {
    if (!selectedMonth) { setStatement(null); return; }
    setLoading(true);
    fetch(`/api/months/${selectedMonth.id}/statement`)
      .then((r) => r.json())
      .then(setStatement)
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  async function closeMonth() {
    if (!selectedMonth) return;
    if (!confirm('Close this month? Expenses will be locked.')) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/months/${selectedMonth.id}/close`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Month closed!', 'success');
      // Refresh
      const updatedMonths = await fetch(`/api/months?groupId=${selectedGroupId}`).then((r) => r.json());
      setMonths(updatedMonths);
      const updated = updatedMonths.find((m: Month) => m.id === selectedMonth.id);
      setSelectedMonth(updated || null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Monthly Statement</h1>

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

      {selectedGroupId && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">{formatMonth(month)}</h2>
            {selectedMonth?.status === 'closed' && <Badge variant="gray">Closed</Badge>}
            {selectedMonth?.status === 'open' && <Badge variant="green">Open</Badge>}
            {!selectedMonth && <Badge variant="yellow">No data</Badge>}
          </div>
          <div className="flex gap-2">
            {selectedMonth?.status === 'open' && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowSettlement(true)}>
                  + Settlement
                </Button>
                <Button size="sm" variant="danger" onClick={closeMonth} loading={closing}>
                  Close Month
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {loading && <div className="flex items-center justify-center h-48"><Spinner size="lg" className="text-brand-600" /></div>}

      {!loading && !selectedMonth && selectedGroupId && (
        <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
          No expenses recorded for this month yet.<br />
          Add an expense to see the statement.
        </div>
      )}

      {!loading && statement && (
        <MonthlyStatementComponent statement={statement} />
      )}

      <Modal isOpen={showSettlement} onClose={() => setShowSettlement(false)} title="Record Settlement">
        {statement && (
          <SettlementForm
            groupId={selectedGroupId}
            month={month}
            members={statement.members}
            onSettled={() => {
              setShowSettlement(false);
              // Reload statement
              if (selectedMonth) {
                fetch(`/api/months/${selectedMonth.id}/statement`)
                  .then((r) => r.json())
                  .then(setStatement);
              }
            }}
            onCancel={() => setShowSettlement(false)}
          />
        )}
      </Modal>
    </div>
  );
}
