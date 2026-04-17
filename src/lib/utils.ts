import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Debt, Expense, Member, SplitDetail } from '../types';

/**
 * 最佳化結算邏輯
 * 1. 計算每個人的淨餘額 (收到的錢 - 付出的應分擔金額)
 * 2. 分出債權人 (債權 > 0) 與債務人 (債權 < 0)
 * 3. 媒合債權人與債務人，生成最少筆數的轉帳
 */
export function calculateSettlement(members: Member[], expenses: Expense[]): Debt[] {
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m.id] = 0);

  expenses.forEach(exp => {
    // 付款人獲得債權 (總額)
    balances[exp.payerId] = (balances[exp.payerId] || 0) + exp.totalAmount;
    
    // 每個參與者產生債務 (應分擔額)
    exp.splits.forEach(split => {
      balances[split.memberId] = (balances[split.memberId] || 0) - split.amount;
    });
  });

  const creditors = members
    .map(m => ({ id: m.id, amount: balances[m.id] }))
    .filter(m => m.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const debtors = members
    .map(m => ({ id: m.id, amount: -balances[m.id] }))
    .filter(m => m.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const amount = Math.min(creditor.amount, debtor.amount);
    
    if (amount > 0) {
      debts.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(amount.toFixed(2))
      });
    }

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return debts;
}
