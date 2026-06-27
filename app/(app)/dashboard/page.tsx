'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Group, Expense, PublicUser, Month } from '@/lib/types';
import { calculateMonthlyBalances, formatCurrency, getCurrentMonth, formatMonth } from '@/lib/calculations';
import StatCard from '@/components/dashboard/StatCard';
import BalanceSummary from '@/components/dashboard/BalanceSummary';
import ExpenseChart from '@/components/dashboard/ExpenseChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [month, setMonth] = useState(getCurrentMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<PublicUser[]>([]);
  const [monthRecord, setMonthRecord] = useState<Month | null>(null);
  const [settlements, setSettlements] = useState<{ paidBy: string; receivedBy: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

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
      fetch(`/api/expenses?groupId=${selectedGroupId}&month=${month}`).then((r) => r.json()),
      fetch(`/api/settlements?groupId=${selectedGroupId}&month=${month}`).then((r) => r.json()),
      fetch(`/api/months?groupId=${selectedGroupId}`).then((r) => r.json()),
    ])
      .then(([group, exps, setts, months]) => {
        setMembers(group.members || []);
        setExpenses(exps);
        setSettlements(setts);
        const currentMonth = (months as Month[]).find((m) => m.month === month);
        setMonthRecord(currentMonth || null);
      })
      .finally(() => setLoading(false));
  }, [selectedGroupId, month]);

  const pendingExpenses = expenses.filter((e) => e.status === 'pending');
  const submittedExpenses = expenses.filter((e) => e.status === 'submitted');
  const totalExpenses = submittedExpenses.reduce((s, e) => s + e.totalAmount, 0);
  const commonExpenses = submittedExpenses.reduce(
    (s, e) => s + e.lineItems.filter((i) => i.type === 'common').reduce((ss, i) => ss + i.total, 0),
    0
  );

  const carryForward = monthRecord?.carryForward || {};
  const balances = calculateMonthlyBalances(submittedExpenses, settlements as any, carryForward);

  if (loading && selectedGroupId) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-700">No groups yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a group to start tracking expenses</p>
        </div>
        <Link href="/groups">
          <Button>Create Group</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Group + month selector */}
      <div className="flex gap-2">
        {groups.length > 1 && (
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {pendingExpenses.length > 0 && (
        <Link
          href="/pending"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-bold flex-shrink-0">
            {pendingExpenses.length}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {pendingExpenses.length} expense{pendingExpenses.length !== 1 ? 's' : ''} pending approval
            </p>
            <p className="text-xs text-amber-600">Tap to classify and approve</p>
          </div>
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{formatMonth(month)}</h2>
        {monthRecord?.status === 'closed' && <Badge variant="gray">Closed</Badge>}
        {monthRecord?.status === 'open' && <Badge variant="green">Open</Badge>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Total"
          value={formatCurrency(totalExpenses)}
          subtitle={`${submittedExpenses.length} bills`}
          accent="blue"
          icon={<WalletIcon />}
        />
        <StatCard
          title="Common"
          value={formatCurrency(commonExpenses)}
          subtitle="Shared expenses"
          accent="purple"
          icon={<ShareIcon />}
        />
      </div>

      {/* Balance summary */}
      {members.length > 0 && <BalanceSummary balances={balances} members={members} />}

      {/* Chart */}
      {submittedExpenses.length > 0 && <ExpenseChart expenses={submittedExpenses} members={members} />}
      {submittedExpenses.length > 0 && <CategoryPieChart expenses={submittedExpenses} />}

      {/* Recent expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Recent Expenses</h3>
          <Link href={`/expenses/new?groupId=${selectedGroupId}`} className="text-xs text-brand-600 font-medium">
            + Add
          </Link>
        </div>
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            No expenses yet this month
          </div>
        ) : (
          <div className="space-y-2">
            {[...expenses].sort((a, b) => b.billDate.localeCompare(a.billDate)).slice(0, 8).map((expense) => (
              <Link
                key={expense.id}
                href={expense.status === 'pending' ? `/expenses/${expense.id}/approve` : `/expenses/${expense.id}`}
              >
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center justify-between hover:border-gray-200 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.description || expense.merchant}
                    </p>
                    <p className="text-xs text-gray-400">{expense.billDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.totalAmount)}</p>
                    <Badge
                      variant={expense.status === 'submitted' ? 'green' : expense.status === 'pending' ? 'yellow' : 'gray'}
                      className="text-[10px]"
                    >
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
