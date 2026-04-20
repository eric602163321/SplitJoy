export type SplitType = 'equal' | 'custom';

export interface SplitDetail {
  memberId: string;
  amount: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export interface Expense {
  id: string;
  totalAmount: number;
  description: string;
  notes?: string;
  date: string;
  category: string;
  payerId: string;
  splitType: SplitType;
  splits: SplitDetail[];
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  expenses: Expense[];
  currency: string;
  createdAt: string;
  ownerId?: string;
}

export type Tab = 'personal' | 'group' | 'settings';

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}
