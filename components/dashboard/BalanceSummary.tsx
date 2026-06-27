import type { PublicUser } from '@/lib/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/calculations';

interface BalanceSummaryProps {
  balances: Record<string, number>;
  members: PublicUser[];
}

export default function BalanceSummary({ balances, members }: BalanceSummaryProps) {
  const memberIds = Object.keys(balances);
  const debtor = memberIds.find((id) => (balances[id] || 0) < 0);
  const creditor = memberIds.find((id) => (balances[id] || 0) > 0);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Balance Summary</h3>
      <div className="space-y-3">
        {members.map((member) => {
          const balance = balances[member.id] || 0;
          const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="text-sm font-medium text-gray-900">{member.name}</span>
              </div>
              <Badge variant={balance > 0 ? 'green' : balance < 0 ? 'red' : 'gray'}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </Badge>
            </div>
          );
        })}
      </div>

      {debtor && creditor && (
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-medium text-amber-800">
            {members.find((m) => m.id === debtor)?.name} owes{' '}
            {members.find((m) => m.id === creditor)?.name}{' '}
            <strong>{formatCurrency(Math.abs(balances[debtor]))}</strong>
          </p>
        </div>
      )}
    </Card>
  );
}
