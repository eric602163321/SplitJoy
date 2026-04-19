import { Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'food', label: '飲食', icon: '🍴', color: '#B74C40' },
  { id: 'housing', label: '住宿', icon: '🏠', color: '#4A6E63' },
  { id: 'transport', label: '交通', icon: '🚗', color: '#6B8D9C' },
  { id: 'shopping', label: '購物', icon: '🛍️', color: '#E2A752' },
  { id: 'entertainment', label: '娛樂', icon: '🎮', color: '#8A7261' },
  { id: 'others', label: '其他', icon: '📦', color: '#A3A8AC' },
];

export const RETRO_COLORS = [
  '#B74C40', '#E2A752', '#4A6E63', '#6B8D9C', '#8A7261', '#A3A8AC'
];

export const CURRENCIES = [
  { code: 'TWD', name: 'NT$ 新台幣' },
  { code: 'USD', name: '$ 美金' },
  { code: 'JPY', name: '¥ 日圓' },
  { code: 'HKD', name: 'HK$ 港幣' },
  { code: 'EUR', name: '€ 歐元' },
  { code: 'KRW', name: '₩ 韓圓' },
  { code: 'THB', name: '฿ 泰銖' },
];
