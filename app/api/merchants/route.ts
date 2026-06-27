import { NextRequest, NextResponse } from 'next/server';
import { readExpenses } from '@/lib/data';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const expenses = await readExpenses();
  const merchants = Array.from(
    new Set(
      expenses
        .map((e) => e.merchant?.trim())
        .filter((m): m is string => !!m && m !== 'Unknown')
    )
  ).sort();
  return NextResponse.json(merchants);
}
