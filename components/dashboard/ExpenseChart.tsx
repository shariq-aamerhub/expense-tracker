'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import type { Expense, PublicUser } from '@/lib/types';
import Card from '@/components/ui/Card';

interface ExpenseChartProps {
  expenses: Expense[];
  members: PublicUser[];
}

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
  const dayMap: Record<string, { common: number; personal: number }> = {};

  for (const expense of expenses) {
    if (expense.status !== 'submitted') continue;
    const day = expense.billDate.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { common: 0, personal: 0 };
    for (const item of expense.lineItems) {
      if (item.type === 'common') {
        dayMap[day].common += item.total;
      } else {
        dayMap[day].personal += item.total;
      }
    }
    if (expense.lineItems.length === 0) {
      dayMap[day].common += expense.totalAmount;
    }
  }

  const data = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { common, personal }]) => ({
      day: day.slice(5),
      common: Math.round(common * 100) / 100,
      personal: Math.round(personal * 100) / 100,
    }));

  if (data.length === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Spending</h3>
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
          No expense data yet
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Daily Spending</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500" />
            Common
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400" />
            Personal
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value: number, name: string) => [
                `AED ${value.toFixed(2)}`,
                name === 'common' ? 'Common' : 'Personal',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="common" name="common" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="common"
                position="top"
                style={{ fontSize: 10, fontWeight: 600, fill: '#3b82f6' }}
                formatter={(v: number) => (v > 0 ? v.toFixed(0) : '')}
              />
            </Bar>
            <Bar dataKey="personal" name="personal" fill="#c084fc" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="personal"
                position="top"
                style={{ fontSize: 10, fontWeight: 600, fill: '#a855f7' }}
                formatter={(v: number) => (v > 0 ? v.toFixed(0) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
