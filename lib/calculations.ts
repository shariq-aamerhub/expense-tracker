import type { Expense, Settlement, MonthStatement, User } from './types';

export function calculateExpenseShares(expense: Expense): Record<string, number> {
  const shares: Record<string, number> = {};

  for (const item of expense.lineItems) {
    if (item.type === 'personal' && item.responsibleMemberId) {
      shares[item.responsibleMemberId] = (shares[item.responsibleMemberId] || 0) + item.total;
    } else if (item.type === 'common' && item.participantIds.length > 0) {
      const splitAmount = item.total / item.participantIds.length;
      for (const memberId of item.participantIds) {
        shares[memberId] = (shares[memberId] || 0) + splitAmount;
      }
    }
  }

  // If line items don't cover the full bill, split the gap equally among all participants
  const lineItemsTotal = expense.lineItems.reduce((s, i) => s + i.total, 0);
  const gap = expense.totalAmount - lineItemsTotal;
  if (Math.abs(gap) > 0.01) {
    const allParticipants = Array.from(new Set([
      expense.paidBy,
      ...expense.lineItems.flatMap((i) =>
        i.type === 'common' ? i.participantIds : i.responsibleMemberId ? [i.responsibleMemberId] : []
      ),
    ]));
    const perPerson = gap / allParticipants.length;
    for (const memberId of allParticipants) {
      shares[memberId] = (shares[memberId] || 0) + perPerson;
    }
  }

  return shares;
}

export function calculateNetBalances(expense: Expense): Record<string, number> {
  const shares = expense.calculatedShares;
  const balances: Record<string, number> = {};

  for (const [memberId, share] of Object.entries(shares)) {
    balances[memberId] = -share;
  }

  // Payer gets credit for full amount paid
  balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.totalAmount;

  return balances;
}

export function calculateMonthlyBalances(
  expenses: Expense[],
  settlements: Settlement[],
  carryForward: Record<string, number>
): Record<string, number> {
  const balances: Record<string, number> = { ...carryForward };

  for (const expense of expenses) {
    if (expense.status !== 'submitted') continue;
    const netBalances = calculateNetBalances(expense);
    for (const [memberId, balance] of Object.entries(netBalances)) {
      balances[memberId] = (balances[memberId] || 0) + balance;
    }
  }

  for (const settlement of settlements) {
    // Payer's balance improves (they paid out money to settle debt)
    balances[settlement.paidBy] = (balances[settlement.paidBy] || 0) - settlement.amount;
    // Receiver's balance decreases (their receivable was fulfilled)
    balances[settlement.receivedBy] = (balances[settlement.receivedBy] || 0) + settlement.amount;
  }

  return balances;
}

export function calculateMonthStatement(
  expenses: Expense[],
  settlements: Settlement[],
  members: User[],
  carryForward: Record<string, number>,
  month: string,
  groupId: string,
  status: 'open' | 'closed'
): MonthStatement {
  const submittedExpenses = expenses.filter((e) => e.status === 'submitted');

  const perMember: MonthStatement['perMember'] = {};

  for (const member of members) {
    perMember[member.id] = {
      totalPaid: 0,
      totalShare: 0,
      personalExpenses: 0,
      commonShare: 0,
      netBalance: carryForward[member.id] || 0,
    };
  }

  for (const expense of submittedExpenses) {
    // Track who paid
    if (perMember[expense.paidBy]) {
      perMember[expense.paidBy].totalPaid += expense.totalAmount;
    }

    // Track shares
    for (const [memberId, share] of Object.entries(expense.calculatedShares)) {
      if (!perMember[memberId]) continue;
      perMember[memberId].totalShare += share;
    }

    // Track personal vs common
    for (const item of expense.lineItems) {
      if (item.type === 'personal' && item.responsibleMemberId) {
        if (perMember[item.responsibleMemberId]) {
          perMember[item.responsibleMemberId].personalExpenses += item.total;
        }
      } else if (item.type === 'common') {
        const splitAmount = item.participantIds.length > 0 ? item.total / item.participantIds.length : 0;
        for (const participantId of item.participantIds) {
          if (perMember[participantId]) {
            perMember[participantId].commonShare += splitAmount;
          }
        }
      }
    }
  }

  // Apply settlements
  for (const settlement of settlements) {
    if (perMember[settlement.paidBy]) {
      perMember[settlement.paidBy].netBalance -= settlement.amount;
    }
    if (perMember[settlement.receivedBy]) {
      perMember[settlement.receivedBy].netBalance += settlement.amount;
    }
  }

  // Calculate net balance per member
  for (const member of members) {
    const m = perMember[member.id];
    m.netBalance += m.totalPaid - m.totalShare;
  }

  // Final balances = net balance per member
  const finalBalances: Record<string, number> = {};
  for (const [memberId, data] of Object.entries(perMember)) {
    finalBalances[memberId] = data.netBalance;
  }

  // Determine who owes whom (simplified two-person case)
  let settlementSummary: MonthStatement['settlement'] = null;
  const memberIds = Object.keys(finalBalances);
  if (memberIds.length === 2) {
    const [a, b] = memberIds;
    if (finalBalances[a] > 0 && finalBalances[b] < 0) {
      settlementSummary = { from: b, to: a, amount: Math.abs(finalBalances[b]) };
    } else if (finalBalances[b] > 0 && finalBalances[a] < 0) {
      settlementSummary = { from: a, to: b, amount: Math.abs(finalBalances[a]) };
    }
  }

  return {
    month,
    groupId,
    status,
    carryForward,
    expenses: submittedExpenses,
    settlements,
    perMember,
    finalBalances,
    settlement: settlementSummary,
  };
}

export function formatCurrency(amount: number): string {
  return `AED ${amount.toFixed(2)}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
