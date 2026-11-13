import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Debt, Expense, Member, Category } from '../types';
import { CATEGORIES } from '../constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 檢查目前語系是否為中文（支援 zh, zh-TW, zh-HK, zh-Hant 等）
 */
export function isChineseLocale(lang?: string): boolean {
  return (lang || '').toLowerCase().startsWith('zh');
}

/**
 * 產生高熵隨機 ID（適用於高安全性的團體邀請碼與文件 ID）
 */
export function generateGroupId(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

/**
 * 解析並驗證團體邀請碼（同時支援直接輸入邀請碼或貼上完整邀請連結 ?join=...）
 */
export function extractInviteCode(rawInput: string): string | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (trimmed.includes('://') || trimmed.includes('join=')) {
    try {
      const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed, 'https://splitjoy.local');
      const joinParam = url.searchParams.get('join');
      if (joinParam) {
        candidate = joinParam.trim();
      }
    } catch {
      const match = trimmed.match(/[?&]join=([^&#]+)/);
      if (match?.[1]) {
        candidate = decodeURIComponent(match[1]).trim();
      }
    }
  }

  return /^[a-zA-Z0-9_-]{1,128}$/.test(candidate) ? candidate : null;
}

/**
 * 安全解析 JSON，避免損毀的 localStorage 資料導致白屏崩潰
 */
export function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (e) {
    console.warn('[Storage] Failed to parse JSON, falling back to default:', e);
    return fallback;
  }
}

/**
 * 遞迴移除物件中的 undefined 屬性，避免 Firestore 寫入錯誤
 */
export function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * 根據 ID 獲取類別資訊，支援舊版 'food' ID 相容
 */
export function getCategoryById(id: string): Category {
  const category = CATEGORIES.find(c => c.id === id);
  if (category) return category;

  if (id === 'food') {
    return CATEGORIES.find(c => c.id === 'dining') || CATEGORIES[0];
  }

  return CATEGORIES[CATEGORIES.length - 1];
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
  if (isChineseLocale(i18n?.language)) return cat.label;

  const translateId = id === 'food' ? 'dining' : id;
  return t(`cat_${translateId}`) || cat.label;
}

/**
 * 獲取月份顯示標籤（例如：2024年3月 或 March 2024）
 */
export function getMonthLabel(monthKey: string, i18n: any): string {
  const [year, month] = monthKey.split('/').map(Number);
  if (isChineseLocale(i18n?.language)) {
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
    if (isNaN(date.getTime())) return;
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
    if (isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
    months[key] = (months[key] || 0) + exp.totalAmount;
  });

  return Object.entries(months)
    .sort((a, b) => {
      const [ya, ma] = a[0].split('/').map(Number);
      const [yb, mb] = b[0].split('/').map(Number);
      return ya !== yb ? ya - yb : ma - mb;
    })
    .slice(-6)
    .map(([name, amount]) => ({ name, amount }));
}

/**
 * 最佳化結算邏輯
 * 1. 收集所有出現在成員列表與帳單中的參與者 ID，避免曾付款/分帳但後來被移除的成員導致總帳不平
 * 2. 計算每個人的淨餘額 (代墊總額 - 應分擔總額)
 * 3. 分出債權人 (債權 > 0) 與債務人 (債權 < 0)
 * 4. 媒合債權人與債務人，生成最少筆數的轉帳
 */
export function calculateSettlement(members: Member[], expenses: Expense[]): Debt[] {
  const balances: Record<string, number> = {};
  const participantIds = new Set<string>(members.map(m => m.id));

  expenses.forEach(exp => {
    if (exp.payerId) participantIds.add(exp.payerId);
    exp.splits.forEach(split => {
      if (split.memberId && split.amount > 0) participantIds.add(split.memberId);
    });
  });

  participantIds.forEach(id => {
    balances[id] = 0;
  });

  expenses.forEach(exp => {
    if (exp.payerId) {
      balances[exp.payerId] = (balances[exp.payerId] || 0) + exp.totalAmount;
    }
    exp.splits.forEach(split => {
      if (split.memberId) {
        balances[split.memberId] = (balances[split.memberId] || 0) - split.amount;
      }
    });
  });

  const allParticipantIds = Array.from(participantIds);

  const creditors = allParticipantIds
    .map(id => ({ id, amount: balances[id] }))
    .filter(m => m.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const debtors = allParticipantIds
    .map(id => ({ id, amount: -balances[id] }))
    .filter(m => m.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.amount, debtor.amount);

    if (amount > 0.01) {
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
