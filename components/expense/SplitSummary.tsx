'use client';

import type { Expense, PublicUser } from '@/lib/types';
import { calculateExpenseShares, calculateNetBalances } from '@/lib/calculations';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

interface SplitSummaryProps {
  expense: Partial<Expense>;
  members: PublicUser[];
  onPayerChange: (userId: string) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function SplitSummary({
  expense,
  members,
  onPayerChange,
  onSubmit,
  onBack,
  isSubmitting,
}: SplitSummaryProps) {
  const shares = expense.lineItems ? calculateExpenseShares(expense as Expense) : {};
  const netBalances = expense.paidBy ? calculateNetBalances({ ...expense as Expense, calculatedShares: shares }) : {};

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Merchant</span>
          <span className="font-medium">{expense.merchant}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Date</span>
          <span className="font-medium">{expense.billDate}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold text-gray-900">AED {(expense.totalAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Items</span>
          <span>{expense.lineItems?.length || 0} items</span>
        </div>
      </div>

      <Select
        label="Who paid this bill?"
        options={memberOptions}
        value={expense.paidBy || ''}
        onChange={(e) => onPayerChange(e.target.value)}
        placeholder="Select payer"
      />

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Expense Share Breakdown</h3>
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
          {members.map((member) => {
            const share = shares[member.id] || 0;
            const balance = netBalances[member.id] || 0;
            const isPayer = member.id === expense.paidBy;

            return (
              <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">
                    Share: AED {share.toFixed(2)}
                    {isPayer && ` · Paid: AED ${(expense.totalAmount || 0).toFixed(2)}`}
                  </p>
                </div>
                {expense.paidBy && (
                  <Badge variant={balance >= 0 ? 'green' : 'red'}>
                    {balance >= 0 ? '+' : ''}AED {balance.toFixed(2)}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        {expense.paidBy && (
          <p className="mt-2 text-xs text-gray-400 text-center">
            + means to receive, − means owes
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Back
        </Button>
        <Button
          onClick={onSubmit}
          className="flex-1"
          loading={isSubmitting}
          disabled={!expense.paidBy || isSubmitting}
        >
          Submit Expense
        </Button>
      </div>
    </div>
  );
}
