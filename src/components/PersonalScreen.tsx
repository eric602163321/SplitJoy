import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Sparkles, ChevronRight, BarChart3, ArrowLeft, TrendingUp, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Expense, Member } from '../types';
import { CATEGORIES, RETRO_COLORS } from '../constants';
import { AVATARS } from './AvatarGrid';
import CreateExpenseModal from './CreateExpenseModal';
import PersonalAnalysisView from './PersonalAnalysisView';
import SwipeableExpenseItem from './SwipeableExpenseItem';
import { ScreenHeader, SectionTitle, ValueCard, SortMenu, EmptyState } from './SharedUI';
import { cn, getCategoryById, getCategoryLabel, isExpenseInCategory, getMonthLabel, groupExpensesByMonth, calculateCategoryData, calculateMonthlyTrend } from '../lib/utils';
import { useData } from '../contexts/DataContext';

interface PersonalScreenProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function PersonalScreen({ expenses, setExpenses }: PersonalScreenProps) {
  const { t, i18n } = useTranslation();
  const { defaultCurrency } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sortType, setSortType] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [statsTimeRange, setStatsTimeRange] = useState<'current' | 'all' | 'custom'>('current');
  const [statsSelectedMonth, setStatsSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}`;
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  
  const dragControls = useDragControls();

  useEffect(() => {
    if (showAnalysis) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [showAnalysis]);

  const selfMember: Member = useMemo(() => ({
    id: 'self',
    name: t('me'),
    avatar: AVATARS[0].id
  }), [t]);

  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    expenses.forEach(exp => {
      const code = exp.originalCurrency;
      if (code && code !== defaultCurrency) {
        if (code === 'JPY' && defaultCurrency === 'TWD') initial[code] = 0.22;
        else if (code === 'TWD' && defaultCurrency === 'JPY') initial[code] = 4.55;
        else if (code === 'USD' && defaultCurrency === 'TWD') initial[code] = 32.5;
        else if (code === 'TWD' && defaultCurrency === 'USD') initial[code] = 0.031;
        else initial[code] = 1.0;
      }
    });
    return initial;
  });

  const uniqueForeignCurrencies = useMemo(() => {
    const curs = new Set<string>();
    expenses.forEach(exp => {
      const cur = exp.originalCurrency || defaultCurrency;
      if (cur !== defaultCurrency) {
        curs.add(cur);
      }
    });
    return Array.from(curs);
  }, [expenses, defaultCurrency]);

  const fetchedRef = useRef<Record<string, boolean>>({});
  const loadingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Reset fetched status when base currency changes
    const lastBaseRef = { current: defaultCurrency };
    if (lastBaseRef.current !== defaultCurrency) {
      fetchedRef.current = {};
      loadingRef.current = {};
      lastBaseRef.current = defaultCurrency;
    }

    uniqueForeignCurrencies.forEach(code => {
      setExchangeRates(prev => {
        if (prev[code] !== undefined) return prev;
        const next = { ...prev };
        if (code === 'JPY' && defaultCurrency === 'TWD') next[code] = 0.22;
        else if (code === 'TWD' && defaultCurrency === 'JPY') next[code] = 4.55;
        else if (code === 'USD' && defaultCurrency === 'TWD') next[code] = 32.5;
        else if (code === 'TWD' && defaultCurrency === 'USD') next[code] = 0.031;
        else next[code] = 1.0;
        return next;
      });

      if (!fetchedRef.current[code] && !loadingRef.current[code]) {
        loadingRef.current[code] = true;
        fetch(`https://open.er-api.com/v6/latest/${code}`)
          .then(res => {
            if (!res.ok) throw new Error('Fetch failed');
            return res.json();
          })
          .then(data => {
            if (data && data.rates && data.rates[defaultCurrency]) {
              const rawRate = data.rates[defaultCurrency];
              setExchangeRates(prev => ({
                ...prev,
                [code]: rawRate
              }));
              fetchedRef.current[code] = true;
            }
          })
          .catch(err => {
            console.error(`Failed to fetch personal rate for ${code} into ${defaultCurrency}:`, err);
          })
          .finally(() => {
            loadingRef.current[code] = false;
          });
      }
    });
  }, [uniqueForeignCurrencies, defaultCurrency]);

  const convertedExpenses = useMemo(() => {
    return expenses.map(exp => {
      const cur = exp.originalCurrency || defaultCurrency;
      if (cur === defaultCurrency) {
        return exp;
      }
      const rate = exchangeRates[cur] || 1.0;
      return {
        ...exp,
        totalAmount: exp.totalAmount * rate,
      };
    });
  }, [expenses, defaultCurrency, exchangeRates]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      if (sortType === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortType === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      
      const getConvertedAmount = (exp: Expense) => {
        const cur = exp.originalCurrency || defaultCurrency;
        if (cur === defaultCurrency) return exp.totalAmount;
        const rate = exchangeRates[cur] || 1.0;
        return exp.totalAmount * rate;
      };
      
      if (sortType === 'amount_desc') return getConvertedAmount(b) - getConvertedAmount(a);
      if (sortType === 'amount_asc') return getConvertedAmount(a) - getConvertedAmount(b);
      return 0;
    });
  }, [expenses, sortType, defaultCurrency, exchangeRates]);

  const groupedExpenses = useMemo(() => {
    return groupExpensesByMonth(sortedExpenses);
  }, [sortedExpenses]);

  const currentMonthTotal = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}/${now.getMonth() + 1}`;
    const monthExpenses = groupedExpenses[key] || [];
    return monthExpenses.reduce((sum, exp) => {
      const cur = exp.originalCurrency || defaultCurrency;
      const rate = cur === defaultCurrency ? 1.0 : (exchangeRates[cur] || 1.0);
      return sum + (exp.totalAmount * rate);
    }, 0);
  }, [groupedExpenses, defaultCurrency, exchangeRates]);

  // Track expanded months. Initialized with current month.
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const now = new Date();
    return new Set([`${now.getFullYear()}/${now.getMonth() + 1}`]);
  });

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };


  const categoryData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredExpenses = convertedExpenses.filter(exp => {
      if (statsTimeRange === 'all') return true;
      const expDate = new Date(exp.date);
      if (statsTimeRange === 'current') {
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      }
      const [selYear, selMonth] = statsSelectedMonth.split('/').map(Number);
      return expDate.getMonth() === (selMonth - 1) && expDate.getFullYear() === selYear;
    });

    return calculateCategoryData(filteredExpenses, t, i18n);
  }, [convertedExpenses, i18n.language, statsTimeRange, statsSelectedMonth, t]);

  const monthlyTrendData = useMemo(() => {
    return calculateMonthlyTrend(convertedExpenses);
  }, [convertedExpenses]);

  const handleSaveExpense = (e: Expense) => {
    if (editingExpense) {
      setExpenses(prev => prev.map(old => old.id === editingExpense.id ? e : old));
      setEditingExpense(null);
    } else {
      setExpenses(prev => [e, ...prev]);
    }
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  if (showAnalysis) {
    return (
      <motion.div 
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.15 }}
        onPointerDown={(e) => {
          if (e.clientX < 40) {
            dragControls.start(e);
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80 && info.velocity.x > 300) {
            setShowAnalysis(false);
          }
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onAnimationComplete={() => setIsReady(true)}
        className="flex flex-col gap-6 pb-24 min-h-screen bg-transparent touch-action-none sm:touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      >
        <header className="px-1 pt-8 flex items-center gap-4">
          <button 
            onClick={() => setShowAnalysis(false)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-black" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-black tracking-tight">{t('stats')}</h1>
            <span className="text-[10px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">{t('stats_desc_sub')}</span>
          </div>
        </header>

        {/* Stats View */}
        {isReady && (
          <PersonalAnalysisView 
            categoryData={categoryData}
            monthlyTrendData={monthlyTrendData}
            statsTimeRange={statsTimeRange}
            setStatsTimeRange={setStatsTimeRange}
            statsSelectedMonth={statsSelectedMonth}
            setStatsSelectedMonth={setStatsSelectedMonth}
            isMonthPickerOpen={isMonthPickerOpen}
            setIsMonthPickerOpen={setIsMonthPickerOpen}
            groupedExpenses={groupedExpenses}
            expenses={convertedExpenses}
            expandedCategoryId={expandedCategoryId}
            setExpandedCategoryId={setExpandedCategoryId}
            currency={defaultCurrency}
          />
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={t('personal')} />

      <div className="flex flex-col gap-6">
        <ValueCard 
          label={t('monthly_total')} 
          value={currentMonthTotal.toLocaleString()} 
          currency={defaultCurrency}
        />

        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-[2] ios-btn-primary flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus size={20} strokeWidth={3} />
            {t('add_expense')}
          </button>
          <button 
            onClick={() => setShowAnalysis(true)}
            className="flex-1 bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
          >
            <BarChart3 size={20} className="text-[var(--color-ios-blue)]" strokeWidth={2.5} />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('stats')}</span>
          </button>
        </div>

        <section className="flex flex-col gap-3 pb-24">
          <SectionTitle 
            title={t('recent_records')}
            rightAction={
              <SortMenu 
                isOpen={isSortOpen}
                onToggle={setIsSortOpen}
                currentSort={sortType}
                label={t('sort')}
                options={[
                  { label: t('sort_date_desc'), value: 'date_desc' },
                  { label: t('sort_date_asc'), value: 'date_asc' },
                  { label: t('sort_amount_desc'), value: 'amount_desc' },
                  { label: t('sort_amount_asc'), value: 'amount_asc' },
                ]}
                onSelect={(val) => setSortType(val)}
              />
            }
          />
          
          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {Object.keys(groupedExpenses).length === 0 ? (
                <EmptyState 
                  description={`${t('no_expense_yet')}\n${t('click_to_start')}`}
                />
              ) : (
                Object.entries(groupedExpenses)
                  .sort(([a], [b]) => {
                    const [ya, ma] = a.split('/').map(Number);
                    const [yb, mb] = b.split('/').map(Number);
                    return yb !== ya ? yb - ya : mb - ma;
                  })
                  .map(([monthKey, monthExpenses]) => {
                    const expenses = monthExpenses as Expense[];
                    return (
                      <div key={monthKey} className="flex flex-col gap-2">
                        {/* Month Header */}
                        <button 
                          onClick={() => toggleMonth(monthKey)}
                          className="flex items-center justify-between px-2 py-1 outline-none group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-black text-black tracking-tight">{getMonthLabel(monthKey, i18n)}</span>
                            <div className="h-[1px] w-4 bg-gray-100" />
                            <span className="text-[10px] font-bold text-gray-400">
                              {expenses.length} {t('expenses')}
                            </span>
                          </div>
                          <ChevronDown 
                            size={14} 
                            className={cn("text-gray-300 transition-transform duration-300", expandedMonths.has(monthKey) && "rotate-180")} 
                          />
                        </button>

                        <AnimatePresence>
                          {expandedMonths.has(monthKey) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2">
                                {expenses.map((exp) => (
                                  <SwipeableExpenseItem 
                                    key={exp.id} 
                                    exp={exp} 
                                    onDelete={handleDeleteExpense}
                                    onEdit={handleEditExpense}
                                    isPersonal={true}
                                    currency={defaultCurrency}
                                    exchangeRate={exp.originalCurrency ? (exchangeRates[exp.originalCurrency] || 1.0) : 1.0}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <CreateExpenseModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        members={[selfMember]}
        onSave={handleSaveExpense}
        initialExpense={editingExpense || undefined}
        groupCurrency={defaultCurrency}
      />
    </div>
  );
}
