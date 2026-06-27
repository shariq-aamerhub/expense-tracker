'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Expense } from '@/lib/types';
import Card from '@/components/ui/Card';

interface CategoryPieChartProps {
  expenses: Expense[];
}

const COLORS = [
  '#3b82f6', '#a855f7', '#f59e0b', '#10b981', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280',
];

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function CategoryPieChart({ expenses }: CategoryPieChartProps) {
  const categoryMap: Record<string, number> = {};

  for (const expense of expenses) {
    if (expense.status !== 'submitted') continue;
    if (expense.lineItems.length > 0) {
      for (const item of expense.lineItems) {
        const cat = item.category || 'Others';
        categoryMap[cat] = (categoryMap[cat] || 0) + item.total;
      }
    } else {
      categoryMap['Others'] = (categoryMap['Others'] || 0) + expense.totalAmount;
    }
  }

  const data = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Spending by Category</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `AED ${value.toFixed(2)} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value, entry: any) => (
                <span style={{ fontSize: 11, color: '#374151' }}>
                  {value} <span style={{ color: '#6b7280' }}>AED {entry.payload.value.toFixed(0)}</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
