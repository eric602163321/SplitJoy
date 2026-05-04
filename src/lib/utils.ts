import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { Debt, Expense, Member, Category } from '../types';
import { CATEGORIES } from '../constants';

/**
 * 根據 ID 獲取類別資訊，支援舊版 'food' ID 相容
 */
export function getCategoryById(id: string): Category {
  const category = CATEGORIES.find(c => c.id === id);
  if (category) return category;
  
  // 相容舊版 'food' ID
  if (id === 'food') {
    return CATEGORIES.find(c => c.id === 'dining') || CATEGORIES[0];
  }
  
  return CATEGORIES[CATEGORIES.length - 1]; // 預設返回 '其他'
}

/**
 * 判斷支出是否屬於特定類別，支援 'food' -> 'dining' 的對應
 */
export function isExpenseInCategory(expenseCategory: string, categoryId: string): boolean {
  if (expenseCategory === categoryId) return true;
  if (expenseCategory === 'food' && categoryId === 'dining') return true;
  return false;
}

/**
 * 獲取類別標籤（支援多國語言）
 */
export function getCategoryLabel(id: string, t: (key: string) => string, i18n: any): string {
  const cat = getCategoryById(id);
  if (i18n.language === 'zh') return cat.label;
  
  // 英文版使用翻譯檔，如果是舊版 food 則對應到 dining
  const translateId = id === 'food' ? 'dining' : id;
  return t(`cat_${translateId}`) || cat.label;
}

/**
 * 獲取月份顯示標籤（例如：2024年3月 或 March 2024）
 */
export function getMonthLabel(monthKey: string, i18n: any): string {
  const [year, month] = monthKey.split('/').map(Number);
  if (i18n.language === 'zh') {
    return `${year}年${month}月`;
  }
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * 將支出按月份分組
 */
export function groupExpensesByMonth(expenses: Expense[]): Record<string, Expense[]> {
  const groups: Record<string, Expense[]> = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(exp);
  });
  return groups;
}
/**
 * 計算分類統計數據
 */
export function calculateCategoryData(
  expenses: Expense[], 
  t: (key: string) => string, 
  i18n: any
): { name: string; value: number; color: string; id: string }[] {
  return CATEGORIES.map(cat => {
    const value = expenses
      .filter(exp => isExpenseInCategory(exp.category, cat.id))
      .reduce((sum, exp) => sum + exp.totalAmount, 0);
    return { 
      name: getCategoryLabel(cat.id, t, i18n), 
      value, 
      color: cat.color, 
      id: cat.id 
    };
  }).filter(d => d.value > 0);
}

/**
 * 計算月度趨勢數據
 */
export function calculateMonthlyTrend(expenses: Expense[]): { name: string; amount: number }[] {
  const months: Record<string, number> = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
    months[key] = (months[key] || 0) + exp.totalAmount;
  });

  return Object.entries(months)
    .sort((a, b) => {
      const [ya, ma] = a[0].split('/').map(Number);
      const [yb, mb] = b[0].split('/').map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    })
    .slice(-6) // 只取最近 6 個月
    .map(([name, amount]) => ({ name, amount }));
}

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
