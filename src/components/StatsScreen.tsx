import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ArrowRight, TrendingUp, Check, RotateCcw, Globe, Coins, FileOutput } from 'lucide-react';
import { Member, Expense, Debt } from '../types';
import { CATEGORIES, RETRO_COLORS, CURRENCIES } from '../constants';
import { calculateSettlement, cn, getCategoryById, getCategoryLabel, isExpenseInCategory, calculateCategoryData } from '../lib/utils';
import { AVATARS } from './AvatarGrid';
import CurrencyPickerModal from './CurrencyPickerModal';

interface StatsScreenProps {
  members: Member[];
  expenses: Expense[];
  groupName?: string;
  currentCurrency?: string;
}

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, categoryData } = props;
  if (!payload) return null;
  const entry = categoryData?.find((c: any) => c.name === payload.value);
  const cat = entry ? CATEGORIES.find(item => item.id === entry.id) : null;
  const icon = cat ? cat.icon : '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="#8E8E93"
        fontSize={10}
        fontWeight="bold"
      >
        {icon ? `${icon} ${payload.value}` : payload.value}
      </text>
    </g>
  );
};

const SwipeableDebtItem: React.FC<{ 
  debt: Debt; 
  members: Member[]; 
  isSettled: boolean; 
  onToggle: () => void;
  index: number;
  currentCurrency?: string;
}> = ({ debt, members, isSettled, onToggle, index, currentCurrency }) => {
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
          )}>
            {currentCurrency && currentCurrency !== '$' 
              ? `${debt.amount.toFixed(1)} ${currentCurrency}`
              : `$${debt.amount.toFixed(1)}`
            }
          </span>
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
  
  // Settlement rates toggle state
  const [showSettlementRates, setShowSettlementRates] = useState(true);

  // Chart toggle state: pie or bar
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

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

  // Find all foreign currencies in this group
  const uniqueForeignCurrencies = useMemo(() => {
    const curs = new Set<string>();
    expenses.forEach(exp => {
      if (exp.originalCurrency && exp.originalCurrency !== currentCurrency) {
        curs.add(exp.originalCurrency);
      }
    });
    return Array.from(curs);
  }, [expenses, currentCurrency]);

  // Settlement rate inputs for each foreign currency (1 foreign = X default)
  const [settlementRates, setSettlementRates] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    expenses.forEach(exp => {
      if (exp.originalCurrency && exp.originalCurrency !== currentCurrency) {
        const code = exp.originalCurrency;
        if (!initial[code]) {
          if (code === 'JPY' && currentCurrency === 'TWD') initial[code] = '0.22';
          else if (code === 'TWD' && currentCurrency === 'JPY') initial[code] = '4.55';
          else if (code === 'USD' && currentCurrency === 'TWD') initial[code] = '32.5';
          else if (code === 'TWD' && currentCurrency === 'USD') initial[code] = '0.031';
          else initial[code] = '1.0';
        }
      }
    });
    return initial;
  });

  const [loadingRates, setLoadingRates] = useState<Record<string, boolean>>({});
  const [manuallyModified, setManuallyModified] = useState<Record<string, boolean>>({});
  const [fetchedRates, setFetchedRates] = useState<Record<string, boolean>>({});
  
  const fetchedRef = useRef<Record<string, boolean>>({});
  const loadingRef = useRef<Record<string, boolean>>({});

  // Fetch real-time exchange rates to replace defaults
  useEffect(() => {
    uniqueForeignCurrencies.forEach(code => {
      // Ensure initial slot exists if not defined yet
      setSettlementRates(prev => {
        if (prev[code] !== undefined) return prev;
        const next = { ...prev };
        if (code === 'JPY' && currentCurrency === 'TWD') next[code] = '0.22';
        else if (code === 'TWD' && currentCurrency === 'JPY') next[code] = '4.55';
        else if (code === 'USD' && currentCurrency === 'TWD') next[code] = '32.5';
        else if (code === 'TWD' && currentCurrency === 'USD') next[code] = '0.031';
        else next[code] = '1.0';
        return next;
      });

      // Fetch real rate if not fetched yet, not manually modified, and not currently loading
      if (!fetchedRef.current[code] && !manuallyModified[code] && !loadingRef.current[code]) {
        loadingRef.current[code] = true;
        setLoadingRates(prev => ({ ...prev, [code]: true }));
        const targetBase = currentCurrency || 'TWD';
        
        fetch(`https://open.er-api.com/v6/latest/${code}`)
          .then(res => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.json();
          })
          .then(data => {
            if (data && data.rates && data.rates[targetBase]) {
              const rawRate = data.rates[targetBase];
              const rateVal = parseFloat(rawRate.toFixed(4)).toString();
              setSettlementRates(prev => {
                if (manuallyModified[code]) return prev;
                return { ...prev, [code]: rateVal };
              });
              fetchedRef.current[code] = true;
              setFetchedRates(prev => ({ ...prev, [code]: true }));
            }
          })
          .catch(err => {
            console.error(`Failed to fetch rate for ${code}:`, err);
          })
          .finally(() => {
            loadingRef.current[code] = false;
            setLoadingRates(prev => ({ ...prev, [code]: false }));
          });
      }
    });
  }, [uniqueForeignCurrencies, currentCurrency, manuallyModified]);

  // Convert all expenses to group default currency based on settlementRates
  const convertedExpenses = useMemo(() => {
    return expenses.map(exp => {
      const cur = exp.originalCurrency || currentCurrency || 'TWD';
      if (cur === currentCurrency) {
        return exp;
      }
      const rateStr = settlementRates[cur] || '1.0';
      const rate = parseFloat(rateStr) || 1.0;
      return {
        ...exp,
        totalAmount: exp.totalAmount * rate,
        splits: exp.splits.map(s => ({
          ...s,
          amount: s.amount * rate
        }))
      };
    });
  }, [expenses, currentCurrency, settlementRates]);

  const categoryData = useMemo(() => {
    return calculateCategoryData(convertedExpenses, t, i18n);
  }, [convertedExpenses, i18n.language, t]);

  const memberSpending = useMemo(() => {
    return members.map(m => {
      const total = convertedExpenses.reduce((sum, exp) => {
        const split = exp.splits.find(s => s.memberId === m.id);
        return sum + (split?.amount || 0);
      }, 0);
      return { ...m, total };
    });
  }, [members, convertedExpenses]);

  const settlements = useMemo(() => calculateSettlement(members, convertedExpenses), [members, convertedExpenses]);
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
    let active = true;
    const checkSize = () => {
      if (!active) return;
      if (chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
        setHasWidth(true);
        setIsReady(true);
      } else {
        setTimeout(checkSize, 100);
      }
    };
    
    const fallbackTimer = setTimeout(() => {
      if (active) {
        setIsReady(true);
        if (chartContainerRef.current?.clientWidth) {
          setHasWidth(true);
        }
      }
    }, 500);

    checkSize();

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
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

      {/* Pie & Bar Chart Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1 py-1 gap-2 flex-wrap sm:flex-nowrap">
          <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">{t('expense_categories')}</h2>
          
          <div className="flex items-center gap-2">
            {/* iOS style segmented control */}
            <div className="flex bg-[#EFEFF4] p-0.5 rounded-lg text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartType('pie')}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all",
                  chartType === 'pie' ? "bg-white text-black shadow-xs" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {i18n.language.startsWith('zh') ? '圓餅圖' : 'Pie'}
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all",
                  chartType === 'bar' ? "bg-white text-black shadow-xs" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {i18n.language.startsWith('zh') ? '直條圖' : 'Bar'}
              </button>
            </div>

            <button 
              onClick={() => setShowExportConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[var(--color-ios-blue)] hover:bg-blue-50 transition-all border border-blue-100"
            >
              <FileOutput size={11} />
              <span>{t('export_report')}</span>
            </button>
          </div>
        </div>
        <div className="ios-card p-6 min-h-[240px] flex flex-col items-center justify-center">
          {categoryData.length > 0 ? (
            <>
            <div className="w-full relative mb-4 min-h-[160px]" ref={chartContainerRef}>
              {categoryData.length > 0 && isReady && hasWidth ? (
                <ResponsiveContainer width="100%" height={160} minWidth={0}>
                  {chartType === 'pie' ? (
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
                  ) : (
                    <BarChart data={categoryData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={<CustomXAxisTick categoryData={categoryData} />} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fill: '#8E8E93', fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false} 
                        hide={true}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0, 0, 0, 0.02)', radius: 4 }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[6, 6, 0, 0]} 
                        barSize={32}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
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
                  <span className="text-[15px] font-bold text-black">
                    {currentCurrency && currentCurrency !== '$' ? `${m.total.toFixed(1)} ${currentCurrency}` : `$${m.total.toFixed(1)}`}
                  </span>
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
                          const catTotal = convertedExpenses
                            .filter(exp => isExpenseInCategory(exp.category, cat.id) && exp.splits.some(s => s.memberId === m.id))
                            .reduce((sum, exp) => sum + (exp.splits.find(s => s.memberId === m.id)?.amount || 0), 0);
                          
                          if (catTotal === 0) return null;
                          
                          return (
                            <div key={cat.id} className="bg-white/50 p-2 rounded-lg flex items-center justify-between border border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{cat.icon}</span>
                                <span className="text-[10px] font-bold text-gray-500">
                                  {getCategoryLabel(cat.id, t, i18n)}
                                </span>
                              </div>
                              <span className="text-[11px] font-black text-black">
                                {currentCurrency && currentCurrency !== '$' ? `${catTotal.toFixed(1)} ${currentCurrency}` : `$${catTotal.toFixed(1)}`}
                              </span>
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
                              {convertedExpenses
                                .filter(exp => exp.splits.some(s => s.memberId === m.id))
                                .map(exp => {
                                  const originalExp = expenses.find(e => e.id === exp.id)!;
                                  return (
                                    <div key={exp.id} className="flex justify-between items-center text-xs">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-gray-700">{exp.description}</span>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                          <span>{getCategoryById(exp.category).icon}</span>
                                          <span>
                                            {getCategoryLabel(exp.category, t, i18n)} | {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="font-bold text-gray-500 text-right whitespace-nowrap">
                                        {exp.originalCurrency && exp.originalCurrency !== currentCurrency ? (
                                          <span className="flex items-center gap-1 justify-end">
                                            <span>
                                              {(originalExp.splits.find(s => s.memberId === m.id)?.amount || 0).toFixed(1)} {exp.originalCurrency}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                              (≒ {currentCurrency === '$' ? `$${(exp.splits.find(s => s.memberId === m.id)?.amount || 0).toFixed(1)}` : `${(exp.splits.find(s => s.memberId === m.id)?.amount || 0).toFixed(1)} ${currentCurrency || ''}`})
                                            </span>
                                          </span>
                                        ) : (
                                          currentCurrency === '$' 
                                            ? `$${(exp.splits.find(s => s.memberId === m.id)?.amount || 0).toFixed(1)}` 
                                            : `${(exp.splits.find(s => s.memberId === m.id)?.amount || 0).toFixed(1)} ${currentCurrency || ''}`
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {convertedExpenses.filter(exp => exp.splits.some(s => s.memberId === m.id)).length === 0 && (
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
          {uniqueForeignCurrencies.length > 0 && (
            <button 
              onClick={() => setShowSettlementRates(!showSettlementRates)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border border-slate-100 shadow-xs",
                showSettlementRates 
                  ? "bg-[#007AFF] text-white border-transparent" 
                  : "bg-white text-[var(--color-ios-blue)] hover:bg-blue-50"
              )}
            >
              <Globe size={11} />
              <span>{i18n.language === 'zh' ? '設定結算匯率' : 'Set Rates'}</span>
              <ChevronDown size={11} className={cn("transition-transform duration-200", showSettlementRates && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Foreign Settlement Rates Card */}
        <AnimatePresence initial={false}>
          {uniqueForeignCurrencies.length > 0 && showSettlementRates && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="ios-card p-4 mx-1 bg-amber-50/50 border border-amber-100/60 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-amber-600 animate-pulse" />
                  <span className="text-[11px] font-black text-amber-900 uppercase tracking-widest">
                    {i18n.language === 'zh' ? '設定外幣結算匯率' : 'Set Foreign Settlement Rates'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  {uniqueForeignCurrencies.map(code => (
                    <div key={code} className="bg-white px-3.5 py-3 rounded-2xl border border-amber-100/80 flex flex-col gap-2 shadow-xs transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-700">
                            1 {code} = 
                          </span>
                          
                          {/* Live, Custom, Loading or Default status badges */}
                          {loadingRates[code] ? (
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 font-bold px-1.5 py-0.5 rounded-sm animate-pulse whitespace-nowrap">
                              ⚡ {i18n.language === 'zh' ? '取得即時匯率中...' : 'Fetching rate...'}
                            </span>
                          ) : manuallyModified[code] ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] bg-blue-50 text-[var(--color-ios-blue)] border border-blue-100 font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                                ✏️ {i18n.language === 'zh' ? '自訂匯率' : 'Custom'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  // Clear manual override
                                  setManuallyModified(prev => {
                                    const next = { ...prev };
                                    delete next[code];
                                    return next;
                                  });
                                  // Clear status so effect re-fetches
                                  fetchedRef.current[code] = false;
                                  setFetchedRates(prev => {
                                    const next = { ...prev };
                                    delete next[code];
                                    return next;
                                  });
                                }}
                                className="text-[9px] font-bold text-gray-400 hover:text-gray-600 active:text-gray-800 underline ml-0.5 whitespace-nowrap transition-colors"
                              >
                                {i18n.language === 'zh' ? '還原即時' : 'Reset'}
                              </button>
                            </div>
                          ) : fetchedRates[code] ? (
                            <span className="text-[9px] bg-green-50 text-green-700 border border-green-100 font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                              🌐 {i18n.language === 'zh' ? '即時匯率' : 'Real-time'}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-gray-50 text-gray-500 border border-gray-100 font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                              ⚠️ {i18n.language === 'zh' ? '預設匯率' : 'Default'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={settlementRates[code] || '1.0'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                setSettlementRates(prev => ({ ...prev, [code]: val }));
                                setManuallyModified(prev => ({ ...prev, [code]: true }));
                              }
                            }}
                            className="w-24 text-right text-sm font-black text-[#007AFF] bg-transparent outline-none border-b border-gray-100 focus:border-[#007AFF] pb-0.5"
                            placeholder="e.g. 0.22"
                          />
                          <span className="text-xs font-bold text-slate-500">{currentCurrency}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                currentCurrency={currentCurrency}
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
