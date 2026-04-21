import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ArrowRight, TrendingUp, Check, RotateCcw, Globe, Coins, FileOutput } from 'lucide-react';
import { Member, Expense, Debt } from '../types';
import { CATEGORIES, RETRO_COLORS, CURRENCIES } from '../constants';
import { calculateSettlement, cn } from '../lib/utils';
import { AVATARS } from './AvatarGrid';
import CurrencyPickerModal from './CurrencyPickerModal';

interface StatsScreenProps {
  members: Member[];
  expenses: Expense[];
  groupName?: string;
  currentCurrency?: string;
}

const SwipeableDebtItem: React.FC<{ 
  debt: Debt; 
  members: Member[]; 
  isSettled: boolean; 
  onToggle: () => void;
  index: number;
  conversion?: {
    rate: number;
    currency: string;
  };
}> = ({ debt, members, isSettled, onToggle, index, conversion }) => {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  
  // Swipe Left (x < 0) -> Settle
  const settleOpacity = useTransform(x, [0, -60], [0, 1]);
  const settleScale = useTransform(x, [0, -60], [0.5, 1]);
  
  // Swipe Right (x > 0) -> Reset
  const resetOpacity = useTransform(x, [0, 60], [0, 1]);
  const resetScale = useTransform(x, [0, 60], [0.5, 1]);

  const fromMember = members.find(m => m.id === debt.from);
  const toMember = members.find(m => m.id === debt.to);

  const handleAction = () => {
    onToggle();
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative overflow-hidden ios-card shadow-none border border-gray-100"
    >
      {/* Reset Background (Right Swipe) */}
      <motion.div 
        style={{ opacity: resetOpacity }}
        className="absolute inset-y-0 left-0 w-20 bg-gray-400 flex items-center justify-center p-4"
      >
        <motion.button 
          style={{ scale: resetScale }}
          onClick={handleAction}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <RotateCcw size={20} strokeWidth={3} />
        </motion.button>
      </motion.div>

      {/* Settle Background (Left Swipe) */}
      <motion.div 
        style={{ opacity: settleOpacity }}
        className="absolute inset-y-0 right-0 w-20 bg-green-500 flex items-center justify-center p-4"
      >
        <motion.button 
          style={{ scale: settleScale }}
          onClick={handleAction}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <Check size={24} strokeWidth={3} />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: isSettled ? 0 : -80, right: isSettled ? 80 : 0 }}
        dragElastic={0.1}
        className={cn(
          "bg-white p-4 flex items-center justify-between relative z-10 transition-all duration-300",
          isSettled ? "bg-green-50" : "bg-white"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[18px] mb-0.5">
              {AVATARS.find(a => a.id === fromMember?.avatar)?.emoji || "👤"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase mb-0.5 whitespace-nowrap">{t('debt_from')}</span>
            <span className="text-[13px] font-extrabold text-black truncate w-16 text-center">{fromMember?.name}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center px-1">
            <ArrowRight size={18} className={cn("transition-colors", isSettled ? "text-green-300" : "text-gray-200")} />
          </div>

          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[18px] mb-0.5">
              {AVATARS.find(a => a.id === toMember?.avatar)?.emoji || "👤"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase mb-0.5 whitespace-nowrap">{t('debt_to')}</span>
            <span className="text-[13px] font-extrabold text-black truncate w-16 text-center">{toMember?.name}</span>
          </div>
        </div>

        <div className="text-right">
          <span className={cn(
            "block text-[10px] font-bold uppercase mb-0.5 transition-colors",
            isSettled ? "text-green-600" : "text-[var(--color-ios-blue)]"
          )}>
            {isSettled ? t('settled') : t('to_transfer')}
          </span>
          <span className={cn(
            "text-xl font-black transition-colors",
            isSettled ? "text-green-600" : "text-[var(--color-ios-blue)]"
          )}>${debt.amount}</span>
          {conversion && conversion.rate !== 1 && (
            <div className="flex flex-col items-end mt-1">
              <span className="text-[10px] text-slate-400 font-bold">{t('approx_conv')}</span>
              <span className="text-sm font-bold text-slate-600">
                {conversion.currency} {(debt.amount * conversion.rate).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {isSettled && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.05 }}
            className="absolute -right-4 -bottom-4 z-0 pointer-events-none"
          >
            <Check size={100} strokeWidth={4} className="text-green-600" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default function StatsScreen({ members, expenses, groupName, currentCurrency }: StatsScreenProps) {
  const { t, i18n } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [settledDebtKeys, setSettledDebtKeys] = useState<Set<string>>(new Set());
  
  // Currency conversion state
  const [targetCurrency, setTargetCurrency] = useState('');
  const [customTargetCurrency, setCustomTargetCurrency] = useState('');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [showConverter, setShowConverter] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const toggleSettled = (from: string, to: string) => {
    const key = `${from}-${to}`;
    const next = new Set(settledDebtKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSettledDebtKeys(next);
  };

  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const total = expenses
        .filter(exp => exp.category === cat.id)
        .reduce((sum, exp) => sum + exp.totalAmount, 0);
      return { 
        name: i18n.language === 'zh' ? cat.label : t(`cat_${cat.id}`), 
        value: total, 
        color: cat.color 
      };
    }).filter(d => d.value > 0);
  }, [expenses, i18n.language, t]);

  const memberSpending = useMemo(() => {
    return members.map(m => {
      const total = expenses.reduce((sum, exp) => {
        const split = exp.splits.find(s => s.memberId === m.id);
        return sum + (split?.amount || 0);
      }, 0);
      return { ...m, total };
    });
  }, [members, expenses]);

  const settlements = useMemo(() => calculateSettlement(members, expenses), [members, expenses]);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  const handleExportCSV = () => {
    // 1. Headers for Category Summary
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel visibility
    csvContent += `${t('expense_categories')}\n`;
    csvContent += `${t('description')},${t('amount')}\n`;
    categoryData.forEach(cat => {
      csvContent += `${cat.name},${cat.value.toFixed(2)}\n`;
    });
    
    csvContent += `\n${t('personal_payable')}\n`;
    csvContent += `${t('member_name')},${t('amount')}\n`;
    memberSpending.forEach(m => {
      csvContent += `${m.name},${m.total.toFixed(2)}\n`;
    });

    if (settlements.length > 0) {
      csvContent += `\n${t('debt_details')}\n`;
      csvContent += `${t('debt_from')},${t('debt_to')},${t('amount')}\n`;
      settlements.forEach(debt => {
        const fromName = members.find(m => m.id === debt.from)?.name || debt.from;
        const toName = members.find(m => m.id === debt.to)?.name || debt.to;
        csvContent += `${fromName},${toName},${debt.amount.toFixed(2)}\n`;
      });
    }

    // Create blobs and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SplitJoy_${groupName || 'Report'}_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportConfirm(false);
  };

  const [isReady, setIsReady] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [hasWidth, setHasWidth] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      if (chartContainerRef.current?.clientWidth) {
        setHasWidth(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onAnimationComplete={() => setIsReady(true)}
      className="flex flex-col gap-6 pb-24"
    >
      <header className="px-1 pt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-black tracking-tight">{groupName || t('unnamed_group')}</h1>
        <span className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase">{t('settlement_stats')}</span>
      </header>

      {/* Pie Chart Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">{t('expense_categories')}</h2>
          <button 
            onClick={() => setShowExportConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[var(--color-ios-blue)] hover:bg-blue-50 transition-all border border-blue-100"
          >
            <FileOutput size={12} />
            <span>{t('export_report')}</span>
          </button>
        </div>
        <div className="ios-card p-6 min-h-[240px] flex flex-col items-center justify-center">
          {categoryData.length > 0 ? (
            <>
            <div className="w-full relative mb-4 min-h-[160px]" ref={chartContainerRef}>
              {categoryData.length > 0 && isReady && hasWidth ? (
                <ResponsiveContainer width="100%" aspect={2.0}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-y-2 gap-x-4 mt-2 w-full">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{cat.name}</span>
                    <span className="text-[11px] font-black text-black ml-auto">${Math.round(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-slate-300 font-medium py-12">
              <TrendingUp size={48} className="mx-auto opacity-20 mb-4" />
              {t('no_stats_data')}
            </div>
          )}
        </div>
      </section>

      {/* Member spending list with Accordion */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider px-1">{t('personal_payable')}</h2>
        <div className="ios-card">
          {memberSpending.map((m) => (
            <div key={m.id} className="border-b border-gray-100 last:border-none">
              <button 
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                className="w-full ios-grouped-item py-4 outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {AVATARS.find(a => a.id === m.avatar)?.emoji || "👤"}
                  </span>
                  <span className="text-[15px] font-semibold">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-black">${m.total.toFixed(1)}</span>
                  <ChevronDown size={16} className={cn("text-gray-300 transition-transform", expandedId === m.id && "rotate-180")} />
                </div>
              </button>
              
              <AnimatePresence>
                {expandedId === m.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-gray-50"
                  >
                    <div className="px-5 py-4 flex flex-col gap-6">
                      {/* Category Summary inside Accordion */}
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map(cat => {
                          const catTotal = expenses
                            .filter(exp => exp.category === cat.id && exp.splits.some(s => s.memberId === m.id))
                            .reduce((sum, exp) => sum + (exp.splits.find(s => s.memberId === m.id)?.amount || 0), 0);
                          
                          if (catTotal === 0) return null;
                          
                          return (
                            <div key={cat.id} className="bg-white/50 p-2 rounded-lg flex items-center justify-between border border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{cat.icon}</span>
                                <span className="text-[10px] font-bold text-gray-500">
                                  {i18n.language === 'zh' ? cat.label : t(`cat_${cat.id}`)}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-black">${catTotal.toFixed(1)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed List */}
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDetailsId(expandedDetailsId === m.id ? null : m.id);
                          }}
                          className="flex items-center justify-between w-full text-[10px] font-bold text-gray-400 uppercase tracking-tighter border-b border-gray-100 pb-1 outline-none"
                        >
                          <span>{t('expense_details')}</span>
                          <ChevronDown size={14} className={cn("transition-transform", expandedDetailsId === m.id && "rotate-180")} />
                        </button>
                        
                        <AnimatePresence>
                          {expandedDetailsId === m.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden flex flex-col gap-3 pt-1"
                            >
                              {expenses
                                .filter(exp => exp.splits.some(s => s.memberId === m.id))
                                .map(exp => (
                                  <div key={exp.id} className="flex justify-between items-center text-xs">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-gray-700">{exp.description}</span>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <span>{CATEGORIES.find(c => c.id === exp.category)?.icon}</span>
                                        <span>
                                          {i18n.language === 'zh' 
                                            ? CATEGORIES.find(c => c.id === exp.category)?.label 
                                            : t(`cat_${exp.category}`)
                                          } | {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-bold text-gray-500">
                                      ${exp.splits.find(s => s.memberId === m.id)?.amount.toFixed(1)}
                                    </span>
                                  </div>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {expenses.filter(exp => exp.splits.some(s => s.memberId === m.id)).length === 0 && (
                        <span className="text-[11px] text-gray-400 italic">{t('no_related_bill')}</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Optimized Settlement Section */}
      <section className="flex flex-col gap-3 pb-8">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">{t('debt_details')}</h2>
          <button 
            onClick={() => setShowConverter(!showConverter)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all",
              showConverter ? "bg-slate-200 text-slate-700" : "text-[var(--color-ios-blue)] hover:bg-blue-50"
            )}
          >
            <Globe size={12} />
            <span>{t('currency_conversion')}</span>
          </button>
        </div>

        <AnimatePresence>
          {showConverter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4 px-1"
            >
              <div className="ios-card p-4 bg-slate-50 border-none shadow-inner flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t('target_currency')}</label>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setIsPickerOpen(true)}
                      className="w-full bg-white flex items-center justify-between py-3 px-4 rounded-xl text-[15px] text-black outline-none border border-slate-100 active:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-bold">
                          {(() => {
                            const found = CURRENCIES.find(c => c.code === targetCurrency);
                            return found ? t(found.name) : (targetCurrency ? `${t('common_currency')}: ${targetCurrency}` : t('select_currency'));
                          })()}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#8E8E93]">{targetCurrency || "-"}</span>
                      </div>
                      <ChevronDown size={18} className="text-[#C7C7CC]" />
                    </button>

                    <CurrencyPickerModal 
                      isOpen={isPickerOpen}
                      onClose={() => setIsPickerOpen(false)}
                      selectedCode={targetCurrency}
                      excludeCode={currentCurrency}
                      onSelect={(code) => {
                        setTargetCurrency(code);
                        setCustomTargetCurrency('');
                      }}
                      title={t('select_currency')}
                    />

                    <input 
                      type="text" 
                      placeholder={t('currency_placeholder')}
                      value={customTargetCurrency}
                      onChange={(e) => {
                        setCustomTargetCurrency(e.target.value.toUpperCase());
                        if (e.target.value) setTargetCurrency('');
                      }}
                      className="w-full bg-white border border-slate-100 py-3 px-4 rounded-xl text-[15px] font-bold placeholder:text-gray-300 outline-none focus:ring-1 focus:ring-[#4285F4] transition-all"
                    />
                  </div>
                </div>

                {(targetCurrency || customTargetCurrency) && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      {t('exchange_rate_label', { currency: currentCurrency || '???' })}
                    </span>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-slate-400">
                        <Coins size={16} />
                      </div>
                      <input 
                        type="number"
                        step="0.0001"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder={t('exchange_rate_placeholder')}
                        className="w-full bg-white border border-slate-100 py-2.5 pl-10 pr-4 rounded-xl text-[14px] font-bold outline-none focus:ring-1 focus:ring-[#4285F4]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 italic px-1">
                      {t('display_name')} {customTargetCurrency || targetCurrency}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {settlements.length > 0 ? (
          <div className="flex flex-col gap-3 px-1">
            {settlements.map((debt, i) => (
              <SwipeableDebtItem 
                key={`${debt.from}-${debt.to}`}
                debt={debt}
                members={members}
                isSettled={settledDebtKeys.has(`${debt.from}-${debt.to}`)}
                onToggle={() => toggleSettled(debt.from, debt.to)}
                index={i}
                conversion={(customTargetCurrency || targetCurrency) ? { 
                  currency: customTargetCurrency || targetCurrency, 
                  rate: parseFloat(exchangeRate) || 0 
                } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="ios-card py-10 text-center">
            <span className="text-sm font-medium text-slate-300">{t('debts_cleared')}</span>
          </div>
        )}
      </section>

      {/* iOS Style Action Sheet for Export Confirmation */}
      <AnimatePresence>
        {showExportConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportConfirm(false)}
              className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[201] p-4 pb-12 flex flex-col gap-3 items-center"
            >
              <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 text-center border-b border-gray-200">
                  <p className="text-[13px] text-[#8E8E93] font-medium leading-tight">
                    {t('export_confirm')}
                  </p>
                </div>
                <button 
                  onClick={handleExportCSV}
                  className="w-full p-4 text-[var(--color-ios-blue)] text-[20px] font-medium active:bg-gray-100 transition-colors"
                >
                  {t('export_report')}
                </button>
              </div>
              <button 
                onClick={() => setShowExportConfirm(false)}
                className="w-full max-w-sm bg-white p-4 text-[#007AFF] text-[20px] font-bold rounded-2xl shadow-lg active:bg-gray-100 transition-colors"
              >
                {t('cancel')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
