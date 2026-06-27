'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { MonthStatement, PublicUser } from '@/lib/types';
import { formatCurrency, formatMonth } from '@/lib/calculations';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface MonthlyStatementProps {
  statement: MonthStatement & { members: PublicUser[] };
}

export default function MonthlyStatement({ statement }: MonthlyStatementProps) {
  const { expenses, settlements, perMember, members, carryForward, settlement, month } = statement;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function memberName(id: string) {
    return members.find((m) => m.id === id)?.name || 'Unknown';
  }

  // Totals for summary banner
  const totalSpend = members.reduce((s, m) => s + (perMember[m.id]?.totalPaid ?? 0), 0);
  const totalCommon = members.reduce((s, m) => s + (perMember[m.id]?.commonShare ?? 0), 0);
  const totalPersonal = members.reduce((s, m) => s + (perMember[m.id]?.personalExpenses ?? 0), 0);

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──────────────────────────────────────────
    const summaryRows: (string | number)[][] = [
      ['Monthly Statement', formatMonth(month)],
      [],
      ['Spending Summary'],
      ['Total Spend', totalSpend],
      ['Common (shared)', totalCommon],
      ['Personal', totalPersonal],
      [],
      ['Member Balances'],
      ['Member', 'Paid', 'Common Share', 'Personal', 'Net Balance'],
      ...members.map((m) => {
        const d = perMember[m.id];
        if (!d) return [m.name, 0, 0, 0, 0];
        return [m.name, d.totalPaid, d.commonShare, d.personalExpenses, d.netBalance];
      }),
      [],
      ['Settlement Verdict'],
      settlement
        ? [`${memberName(settlement.from)} pays ${memberName(settlement.to)}`, settlement.amount]
        : ['Balances are even', ''],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── Sheet 2: Expenses (ascending by date) ─────────────────────
    const sortedExpenses = [...expenses]
      .filter((e) => e.status === 'submitted')
      .sort((a, b) => a.billDate.localeCompare(b.billDate));

    const expenseRows: (string | number)[][] = [
      ['Date', 'Merchant / Description', 'Paid By', 'Total', 'Common', 'Personal', ...members.map((m) => `${m.name} Share`)],
      ...sortedExpenses.map((e) => {
        const common = e.lineItems.filter((i) => i.type === 'common').reduce((s, i) => s + i.total, 0);
        const personal = e.lineItems.filter((i) => i.type !== 'common').reduce((s, i) => s + i.total, 0);
        const shares = e.calculatedShares || {};
        return [
          e.billDate,
          e.merchant || e.description || '',
          memberName(e.paidBy),
          e.totalAmount,
          common,
          personal,
          ...members.map((m) => shares[m.id] ?? 0),
        ];
      }),
    ];
    const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
    wsExpenses['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      ...members.map(() => ({ wch: 14 })),
    ];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

    // ── Sheet 3: Settlements ──────────────────────────────────────
    if (settlements.length > 0) {
      const settlementRows: (string | number)[][] = [
        ['Date', 'Paid By', 'Received By', 'Amount', 'Note'],
        ...settlements.map((s) => [s.date, memberName(s.paidBy), memberName(s.receivedBy), s.amount, s.note || '']),
      ];
      const wsSettlements = XLSX.utils.aoa_to_sheet(settlementRows);
      wsSettlements['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsSettlements, 'Settlements');
    }

    XLSX.writeFile(wb, `statement-${month}.xlsx`);
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
          <Button size="sm" variant="secondary" onClick={exportToExcel}>
            Export Excel
          </Button>
        </div>

        {/* Spend breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-500 font-medium mb-1">Total Spend</p>
            <p className="text-base font-bold text-blue-700">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-500 font-medium mb-1">Common</p>
            <p className="text-base font-bold text-purple-700">{formatCurrency(totalCommon)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-xs text-orange-500 font-medium mb-1">Personal</p>
            <p className="text-base font-bold text-orange-700">{formatCurrency(totalPersonal)}</p>
          </div>
        </div>

        {/* Settlement verdict */}
        {settlement ? (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Settlement Verdict</p>
            <p className="text-sm font-semibold text-amber-900">
              {memberName(settlement.from)} pays {memberName(settlement.to)}{' '}
              <span className="text-amber-700">{formatCurrency(settlement.amount)}</span>
            </p>
          </div>
        ) : (
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Settlement Verdict</p>
            <p className="text-sm font-semibold text-green-800">All balances are even — no payment needed</p>
          </div>
        )}
      </Card>

      {/* Per-member summary */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Member Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left pb-2">Member</th>
                <th className="text-right pb-2">Paid</th>
                <th className="text-right pb-2">Share</th>
                <th className="text-right pb-2">Personal</th>
                <th className="text-right pb-2">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((member) => {
                const data = perMember[member.id];
                if (!data) return null;
                return (
                  <tr key={member.id}>
                    <td className="py-2.5 font-medium">{member.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(data.totalPaid)}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(data.totalShare)}</td>
                    <td className="py-2.5 text-right text-gray-600">{formatCurrency(data.personalExpenses)}</td>
                    <td className="py-2.5 text-right">
                      <Badge variant={data.netBalance >= 0 ? 'green' : 'red'}>
                        {data.netBalance >= 0 ? '+' : ''}{formatCurrency(data.netBalance)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {Object.keys(carryForward).length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-700">Carry-forward from previous month:</p>
            {Object.entries(carryForward).map(([id, amount]) => (
              <p key={id} className="text-xs text-blue-600">
                {memberName(id)}: {amount >= 0 ? '+' : ''}{formatCurrency(amount)}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* Expenses list with per-transaction breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses ({expenses.length})</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No expenses this month</p>
        ) : (
          <div className="space-y-2">
            {[...expenses]
              .sort((a, b) => a.billDate.localeCompare(b.billDate))
              .map((expense) => {
                const isExpanded = expandedId === expense.id;
                const shares = expense.calculatedShares || {};
                return (
                  <div key={expense.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{expense.merchant || expense.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {expense.billDate} · Paid by <span className="font-medium text-gray-700">{memberName(expense.paidBy)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(expense.totalAmount)}</span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 bg-white space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Share per member</p>
                          <div className="space-y-1.5">
                            {members.map((member) => {
                              const share = shares[member.id] || 0;
                              const isPayer = member.id === expense.paidBy;
                              const net = isPayer ? expense.totalAmount - share : -share;
                              return (
                                <div key={member.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-gray-700 font-medium">{member.name}</span>
                                    {isPayer && (
                                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">paid</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-right">
                                    <span className="text-gray-500 text-xs">share: {formatCurrency(share)}</span>
                                    <span className={`font-semibold text-xs w-20 text-right ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                      {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {expense.lineItems.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Line items</p>
                            <div className="space-y-1">
                              {expense.lineItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs text-gray-600">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full font-medium ${
                                      item.type === 'common' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                      {item.type === 'common' ? 'common' : 'personal'}
                                    </span>
                                    <span className="truncate">{item.name}</span>
                                    {item.type === 'personal' && item.responsibleMemberId && (
                                      <span className="text-gray-400 flex-shrink-0">→ {memberName(item.responsibleMemberId)}</span>
                                    )}
                                    {item.type === 'common' && item.participantIds.length > 0 && (
                                      <span className="text-gray-400 flex-shrink-0">
                                        ÷ {item.participantIds.map(memberName).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium flex-shrink-0 ml-2">{formatCurrency(item.total)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Settlements */}
      {settlements.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Settlements</h3>
          <div className="space-y-2">
            {settlements.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {memberName(s.paidBy)} → {memberName(s.receivedBy)}
                  </p>
                  <p className="text-xs text-gray-500">{s.date}{s.note ? ` · ${s.note}` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
