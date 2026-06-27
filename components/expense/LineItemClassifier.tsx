'use client';

import type { LineItem } from '@/lib/types';
import type { PublicUser } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/types';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface LineItemClassifierProps {
  lineItems: LineItem[];
  members: PublicUser[];
  onChange: (items: LineItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function LineItemClassifier({ lineItems, members, onChange, onNext, onBack }: LineItemClassifierProps) {
  function updateItem(idx: number, updates: Partial<LineItem>) {
    const items = lineItems.map((item, i) =>
      i === idx ? { ...item, ...updates } : item
    );
    onChange(items);
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
      ? item.participantIds.filter((id) => id !== memberId)
      : [...item.participantIds, memberId];
    updateItem(idx, { participantIds });
  }

  const commonTotal = lineItems
    .filter((i) => i.type === 'common')
    .reduce((s, i) => s + i.total, 0);
  const personalTotal = lineItems
    .filter((i) => i.type === 'personal')
    .reduce((s, i) => s + i.total, 0);

  const allClassified = lineItems.every(
    (item) =>
      (item.type === 'personal' && item.responsibleMemberId) ||
      (item.type === 'common' && item.participantIds.length > 0)
  );

  return (
    <div className="space-y-4">
      {lineItems.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No line items to classify. The bill total will be treated as a common expense.
        </div>
      )}

      <div className="space-y-3">
        {lineItems.map((item, idx) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name || `Item ${idx + 1}`}</p>
                <p className="text-xs text-gray-500">AED {item.total.toFixed(2)}</p>
              </div>
              <button
                onClick={() => toggleType(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all
                  ${item.type === 'common'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-orange-50 border-orange-300 text-orange-700'
                  }`}
              >
                {item.type === 'common' ? '⚡ Common' : '👤 Personal'}
              </button>
            </div>

            {item.type === 'personal' && (
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => updateItem(idx, { responsibleMemberId: member.id })}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                      ${item.responsibleMemberId === member.id
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
                <p className="text-xs text-gray-500 mb-2">Split between:</p>
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => toggleParticipant(idx, member.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                        ${item.participantIds.includes(member.id)
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

            <div>
              <select
                value={item.category}
                onChange={(e) => updateItem(idx, { category: e.target.value })}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {lineItems.length > 0 && (
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

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1" disabled={lineItems.length > 0 && !allClassified}>
          Next: Review Split
        </Button>
      </div>
    </div>
  );
}
