import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Member, Expense, SplitType, SplitDetail } from '../types';
import { CATEGORIES } from '../constants';
import { cn, getCategoryLabel } from '../lib/utils';
import { AVATARS } from './AvatarGrid';
import CurrencyPickerModal from './CurrencyPickerModal';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSave: (expense: Expense) => void;
  initialExpense?: Expense;
  groupCurrency?: string;
}

export default function CreateExpenseModal({ isOpen, onClose, members, onSave, initialExpense, groupCurrency }: CreateExpenseModalProps) {
  const { t, i18n } = useTranslation();
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [payerId, setPayerId] = useState(members[0]?.id || '');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [selectedSplitMemberIds, setSelectedSplitMemberIds] = useState<string[]>([]);

  // Individual currency states
  const [expenseCurrency, setExpenseCurrency] = useState('TWD');
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

  const amountRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (members.length > 0 && !payerId) {
      setPayerId(members[0].id);
    }
  }, [members, payerId]);

  useEffect(() => {
    if (isOpen) {
      if (initialExpense) {
        const cur = initialExpense.originalCurrency || groupCurrency || 'TWD';
        setExpenseCurrency(cur);
        setTotalAmount((initialExpense.originalAmount ?? initialExpense.totalAmount).toString());

        setDescription(initialExpense.description);
        setNotes(initialExpense.notes || '');
        setCategory(initialExpense.category);
        setPayerId(initialExpense.payerId);
        setSplitType(initialExpense.splitType);
        
        const activeIds = initialExpense.splits.filter(s => s.amount > 0).map(s => s.memberId);
        setSelectedSplitMemberIds(activeIds);
        
        const initialWeights: Record<string, string> = {};
        members.forEach(m => {
          const split = initialExpense.splits.find(s => s.memberId === m.id);
          initialWeights[m.id] = split ? split.amount.toString() : '1';
        });
        setCustomSplits(initialWeights);
      } else {
        const defaultCur = groupCurrency || 'TWD';
        setExpenseCurrency(defaultCur);
        setTotalAmount('');
        setDescription('');
        setNotes('');
        setCategory(CATEGORIES[0].id);
        setSplitType('equal');
        setSelectedSplitMemberIds(members.map(m => m.id));
        if (members.length > 0) {
          setPayerId(members[0].id);
        }
        const initialSplits: Record<string, string> = {};
        members.forEach(m => {
          initialSplits[m.id] = '1';
        });
        setCustomSplits(initialSplits);
      }
      
      const timer = setTimeout(() => {
        if (amountRef.current) {
          amountRef.current.focus();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, members, initialExpense, groupCurrency]);

  const handleAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setTotalAmount(val);
    }
  };

  const handleSelectCurrency = (code: string) => {
    setExpenseCurrency(code);
  };

  const getBaseAmount = (): number => {
    return parseFloat(totalAmount) || 0;
  };

  const toggleSplitMember = (memberId: string) => {
    setSelectedSplitMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCustomSplitChange = (memberId: string, val: string) => {
    setCustomSplits(prev => ({ ...prev, [memberId]: val }));
  };

  const calculateBreakdown = (): SplitDetail[] => {
    const total = getBaseAmount();
    if (total === 0 || members.length === 0) return [];

    const activeMembers = members.filter(m => selectedSplitMemberIds.includes(m.id));
    if (activeMembers.length === 0) {
      return members.map(m => ({ memberId: m.id, amount: 0 }));
    }

    if (splitType === 'equal') {
      const perPerson = total / activeMembers.length;
      return members.map(m => ({
        memberId: m.id,
        amount: selectedSplitMemberIds.includes(m.id) ? perPerson : 0
      }));
    } else {
      const weights = members.map(m => selectedSplitMemberIds.includes(m.id) ? (parseFloat(customSplits[m.id]) || 0) : 0);
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      
      return members.map((m, i) => ({
        memberId: m.id,
        amount: sumWeights > 0 && selectedSplitMemberIds.includes(m.id) ? (total * weights[i]) / sumWeights : 0
      }));
    }
  };

  const splits = calculateBreakdown();
  const isValid = parseFloat(totalAmount) > 0 && splits.length > 0;

  const handleSave = () => {
    if (!isValid) return;
    
    const newExpense: Expense = {
      id: initialExpense?.id || Date.now().toString(),
      totalAmount: getBaseAmount(),
      description,
      notes,
      category,
      date: initialExpense?.date || new Date().toISOString(),
      payerId,
      splitType,
      splits,
      originalAmount: getBaseAmount(),
      originalCurrency: expenseCurrency,
    };
    onSave(newExpense);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative bg-[var(--color-ios-bg)] w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full z-[110]" />

        <div className="sticky top-0 bg-[var(--color-ios-bg)]/80 backdrop-blur-md px-6 py-4 pt-6 flex justify-between items-center border-b border-[var(--color-ios-separator)] z-[100]">
          <button onClick={onClose} className="text-[var(--color-ios-blue)] text-[15px] font-medium">{t('cancel')}</button>
          <span className="text-[17px] font-bold">{t('add_expense')}</span>
          <button 
            onClick={handleSave} 
            disabled={!isValid}
            className={cn(
              "text-[var(--color-ios-blue)] text-[15px] font-bold",
              !isValid && "opacity-30"
            )}
          >
            {t('save')}
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase px-1">{t('amount')}</span>
            <div className="ios-card px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center flex-1">
                {groupCurrency ? (
                  <button
                    type="button"
                    onClick={() => setIsCurrencyPickerOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-xl mr-3 font-extrabold text-[#4285F4] text-xs transition-all border border-gray-100"
                  >
                    <span>{expenseCurrency}</span>
                    <span className="text-[9px] opacity-75">▼</span>
                  </button>
                ) : (
                  <span className="text-2xl font-bold mr-2 text-slate-400">$</span>
                )}
                <input 
                  ref={amountRef}
                  type="text" 
                  inputMode="decimal"
                  pattern="[0-9]*"
                  autoFocus
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full text-2xl font-bold bg-transparent border-none outline-none text-black animate-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase px-1">{t('highest_category')}</span>
              <div className="ios-card flex flex-col">
                <input 
                  type="text" 
                  placeholder={t('expense_item_placeholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="ios-grouped-item w-full outline-none text-[15px] border-b border-gray-100" 
                />
                <textarea 
                  placeholder={t('notes_placeholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-4 outline-none text-[14px] text-gray-500 bg-white min-h-[80px] border-b border-gray-100"
                />
                <div className="p-3 grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                        category === cat.id ? "bg-white shadow-sm ring-1 ring-slate-200" : "opacity-40"
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] font-bold">
                        {getCategoryLabel(cat.id, t, i18n)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {members.length > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase px-1">{t('who_paid')}</span>
              <div className="ios-card p-3 flex flex-wrap gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayerId(m.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all",
                      payerId === m.id 
                        ? "bg-[var(--color-ios-blue)] text-white shadow-md" 
                        : "bg-[#F2F2F7] text-slate-500"
                    )}
                  >
                    <span className="text-sm">
                      {AVATARS.find(a => a.id === m.avatar)?.emoji || "👤"}
                    </span>
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {members.length > 1 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center px-1">
                <div className="flex bg-[#F2F2F7] rounded-lg p-1 w-full">
                  <button 
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={cn("flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all", splitType === 'equal' ? "bg-white shadow-sm text-black" : "text-slate-400")}
                  >{t('all_split')}</button>
                  <button 
                    type="button"
                    onClick={() => setSplitType('custom')}
                    className={cn("flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all", splitType === 'custom' ? "bg-white shadow-sm text-black" : "text-slate-400")}
                  >{t('custom_ratio')}</button>
                </div>
              </div>

              <div className="ios-card flex flex-col">
                {members.map(m => {
                  const isSelected = selectedSplitMemberIds.includes(m.id);
                  return (
                    <div 
                      key={m.id} 
                      className={cn(
                        "ios-grouped-item py-4 cursor-pointer active:bg-gray-50 transition-colors",
                        !isSelected && "bg-gray-50/30"
                      )}
                      onClick={() => toggleSplitMember(m.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "bg-[#4285F4] border-[#4285F4]" : "border-gray-200"
                        )}>
                          {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <div className={cn("w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg", !isSelected && "grayscale opacity-50")}>
                          {AVATARS.find(a => a.id === m.avatar)?.emoji || "😀"}
                        </div>
                        <span className={cn("text-[15px] font-semibold", !isSelected && "text-gray-400")}>{m.name}</span>
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {splitType === 'custom' && (
                          <input 
                            type="number"
                            placeholder={t('ratio_placeholder')}
                            disabled={!isSelected}
                            value={customSplits[m.id] || ''}
                            onChange={(e) => handleCustomSplitChange(m.id, e.target.value)}
                            className={cn(
                              "w-16 h-10 bg-gray-50 rounded-lg text-center font-bold text-sm outline-none border border-gray-100 focus:border-blue-300",
                              !isSelected && "opacity-20"
                            )}
                          />
                        )}
                        <span className={cn("text-[15px] font-bold w-26 text-right transition-colors whitespace-nowrap", isSelected ? "text-[var(--color-ios-blue)]" : "text-gray-300")}>
                          {groupCurrency && groupCurrency !== '$' 
                            ? `${splits.find(s => s.memberId === m.id)?.amount.toFixed(1) || '0.0'} ${groupCurrency}`
                            : `$${splits.find(s => s.memberId === m.id)?.amount.toFixed(1) || '0.0'}`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </motion.div>

      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        selectedCode={expenseCurrency}
        onSelect={handleSelectCurrency}
        title={i18n.language === 'zh' ? '選擇此筆帳單幣別' : 'Bill Currency'}
      />
    </div>
  );
}
