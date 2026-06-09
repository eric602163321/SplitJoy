import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

/**
 * 屏幕標題組件
 */
export const ScreenHeader: React.FC<{
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, leftAction, rightAction, className }) => (
  <header className={cn("px-1 pt-8 flex items-center justify-between", className)}>
    <div className="flex items-center gap-3">
      {leftAction}
      <div className="flex flex-col">
        {subtitle && (
          <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest leading-none mb-1">
            {subtitle}
          </span>
        )}
        <h1 className="text-3xl font-extrabold text-black tracking-tight">{title}</h1>
      </div>
    </div>
    {rightAction}
  </header>
);

/**
 * 區塊標題
 */
export const SectionTitle: React.FC<{
  title: string;
  rightAction?: React.ReactNode;
  className?: string;
}> = ({ title, rightAction, className }) => (
  <div className={cn("flex items-center justify-between px-1", className)}>
    <h2 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{title}</h2>
    {rightAction}
  </div>
);

/**
 * 大金額顯示卡片
 */
export const ValueCard: React.FC<{
  label: string;
  value: string | number;
  currency?: string;
  className?: string;
}> = ({ label, value, currency = '$', className }) => (
  <div className={cn("ios-card flex flex-col items-center justify-center py-8 gap-1 bg-white shadow-md", className)}>
    <span className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest">{label}</span>
    <span className="text-5xl font-black text-black tracking-tighter">
      {currency === '$' ? `$${value}` : `${value} ${currency}`}
    </span>
  </div>
);

/**
 * 排序選單組件
 */
export const SortMenu: React.FC<{
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  currentSort: string;
  options: { label: string; value: string }[];
  onSelect: (value: any) => void;
  label?: string;
}> = ({ isOpen, onToggle, currentSort, options, onSelect, label }) => {
  return (
    <div className="relative">
      <button 
        onClick={() => onToggle(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <span className="text-[10px] font-bold text-gray-400 capitalize">{label || 'Sort'}</span>
        <ChevronDown size={12} className={cn("text-gray-300 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => onToggle(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    onToggle(false);
                  }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-[13px] font-medium transition-colors border-b border-gray-50 last:border-0",
                    currentSort === option.value ? "text-[var(--color-ios-blue)] bg-blue-50/50" : "text-gray-600 active:bg-gray-50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 空狀態視圖
 */
export const EmptyState: React.FC<{
  icon?: LucideIcon;
  title?: string;
  description: string;
  className?: string;
}> = ({ icon: Icon = Sparkles, title, description, className }) => (
  <div className={cn("ios-card flex flex-col items-center justify-center py-12 px-4 text-center gap-2", className)}>
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
      <Icon size={24} className="text-gray-200" />
    </div>
    {title && <span className="font-bold text-sm text-black">{title}</span>}
    <span className="text-[#8E8E93] font-medium text-sm leading-relaxed max-w-[200px]">
      {description}
    </span>
  </div>
);
