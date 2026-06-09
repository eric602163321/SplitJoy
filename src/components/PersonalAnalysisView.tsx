import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Sparkles, TrendingUp, ChevronDown } from 'lucide-react';
import { Expense } from '../types';
import { RETRO_COLORS } from '../constants';
import { cn, getMonthLabel, isExpenseInCategory } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface PersonalAnalysisViewProps {
  categoryData: any[];
  monthlyTrendData: any[];
  statsTimeRange: 'current' | 'all' | 'custom';
  setStatsTimeRange: (range: 'current' | 'all' | 'custom') => void;
  statsSelectedMonth: string;
  setStatsSelectedMonth: (month: string) => void;
  isMonthPickerOpen: boolean;
  setIsMonthPickerOpen: (open: boolean) => void;
  groupedExpenses: Record<string, Expense[]>;
  expenses: Expense[];
  expandedCategoryId: string | null;
  setExpandedCategoryId: (id: string | null) => void;
  currency?: string;
}

const PersonalAnalysisView: React.FC<PersonalAnalysisViewProps> = ({
  categoryData,
  monthlyTrendData,
  statsTimeRange,
  setStatsTimeRange,
  statsSelectedMonth,
  setStatsSelectedMonth,
  isMonthPickerOpen,
  setIsMonthPickerOpen,
  groupedExpenses,
  expenses,
  expandedCategoryId,
  setExpandedCategoryId,
  currency = '$'
}) => {
  const { t, i18n } = useTranslation();
  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const [hasWidth, setHasWidth] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const checkSize = () => {
      if (!active) return;
      if (
        (containerRef1.current && containerRef1.current.clientWidth > 0) ||
        (containerRef2.current && containerRef2.current.clientWidth > 0)
      ) {
        setHasWidth(true);
        setIsReady(true);
      } else {
        setTimeout(checkSize, 100);
      }
    };
    
    const fallbackTimer = setTimeout(() => {
      if (active) {
        setIsReady(true);
        if (containerRef1.current?.clientWidth || containerRef2.current?.clientWidth) {
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
    <div className="flex flex-col gap-6">
      {/* Category Pie Chart */}
      <section className="ios-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            {t('category_ratio')}
          </h3>
          
          <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setStatsTimeRange('current')}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                statsTimeRange === 'current' ? "bg-white text-[var(--color-ios-blue)] shadow-sm" : "text-gray-400"
              )}
            >
              {t('stats_this_month')}
            </button>
            <button
              onClick={() => {
                setStatsTimeRange('custom');
                setIsMonthPickerOpen(!isMonthPickerOpen);
              }}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1",
                statsTimeRange === 'custom' ? "bg-white text-[var(--color-ios-blue)] shadow-sm" : "text-gray-400"
              )}
            >
              {statsTimeRange === 'custom' ? getMonthLabel(statsSelectedMonth, i18n) : (i18n.language === 'zh' ? '選擇月份' : 'Month')}
              <ChevronDown size={10} className={cn("transition-transform", isMonthPickerOpen && "rotate-180")} />
            </button>
            <button
              onClick={() => setStatsTimeRange('all')}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                statsTimeRange === 'all' ? "bg-white text-[var(--color-ios-blue)] shadow-sm" : "text-gray-400"
              )}
            >
              {t('stats_all_time')}
            </button>
          </div>
        </div>

        {/* Month Picker Dropdown */}
        <AnimatePresence>
          {isMonthPickerOpen && statsTimeRange === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 py-2 border-b border-gray-50">
                {Object.keys(groupedExpenses)
                  .sort((a, b) => {
                    const [ya, ma] = a.split('/').map(Number);
                    const [yb, mb] = b.split('/').map(Number);
                    return yb !== ya ? yb - ya : mb - ma;
                  })
                  .map(month => (
                    <button
                      key={month}
                      onClick={() => {
                        setStatsSelectedMonth(month);
                        setIsMonthPickerOpen(false);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                        statsSelectedMonth === month ? "bg-[var(--color-ios-blue)] text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      {getMonthLabel(month, i18n)}
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="w-full relative min-h-[160px]" ref={containerRef1}>
          {categoryData.length > 0 && isReady && hasWidth ? (
            <ResponsiveContainer width="100%" height={160} minWidth={0}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-300 text-xs font-bold">
              {t('no_expense_yet')}
            </div>
          )}
        </div>

        {/* Category Legend & Expandable Details */}
        <div className="flex flex-col gap-2">
          {categoryData.map((d) => (
            <div key={d.id} className="flex flex-col gap-2">
              <button 
                onClick={() => setExpandedCategoryId(expandedCategoryId === d.id ? null : d.id)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm font-bold text-gray-700">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-black flex items-baseline gap-0.5">
                    {currency === '$' ? (
                      `$${d.value.toLocaleString()}`
                    ) : (
                      <>
                        <span>{d.value.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-500 select-none">{currency}</span>
                      </>
                    )}
                  </span>
                  <ChevronDown 
                    size={16} 
                    className={cn("text-gray-300 transition-transform duration-300", expandedCategoryId === d.id && "rotate-180")} 
                  />
                </div>
              </button>
              <AnimatePresence>
                {expandedCategoryId === d.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col gap-2 px-3 pb-3"
                  >
                    {expenses
                      .filter(exp => isExpenseInCategory(exp.category, d.id))
                      .map(exp => (
                        <div key={exp.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-800">{exp.description}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
                            </span>
                          </div>
                           <span className="font-bold text-gray-600 text-right flex flex-col items-end">
                            {exp.originalCurrency && exp.originalCurrency !== currency && exp.originalAmount !== undefined ? (
                              <div className="flex flex-col items-end">
                                <span className="flex items-baseline gap-0.5">
                                  {currency === '$' ? (
                                    `$${exp.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})}`
                                  ) : (
                                    <>
                                      <span>{exp.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 2})}</span>
                                      <span className="text-[9px] font-bold text-gray-400 select-none">{currency}</span>
                                    </>
                                  )}
                                </span>
                                <span className="text-[10px] text-gray-400 font-normal mt-0.5 flex items-baseline gap-0.5">
                                  <span>(</span>
                                  {exp.originalCurrency === '$' ? (
                                    `$${exp.originalAmount.toLocaleString()}`
                                  ) : (
                                    <>
                                      <span>{exp.originalAmount.toLocaleString()}</span>
                                      <span className="text-[8px] font-bold select-none">{exp.originalCurrency}</span>
                                    </>
                                  )}
                                  <span>)</span>
                                </span>
                              </div>
                            ) : (
                              currency === '$' ? (
                                `$${exp.totalAmount.toLocaleString()}`
                              ) : (
                                <span className="flex items-baseline gap-0.5">
                                  <span>{exp.totalAmount.toLocaleString()}</span>
                                  <span className="text-[9px] font-bold text-gray-400 select-none">{currency}</span>
                                </span>
                              )
                            )}
                          </span>
                        </div>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly Trend */}
      <section className="ios-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-black flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-ios-blue)]" />
          {t('monthly_trend')}
        </h3>
        <div className="w-full min-h-[160px]" ref={containerRef2}>
          {monthlyTrendData.length > 0 && isReady && hasWidth ? (
            <ResponsiveContainer width="100%" height={160} minWidth={0}>
              <BarChart data={monthlyTrendData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }}
                  tickFormatter={(val) => val.split('/')[1] + '月'}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[4, 4, 4, 4]} 
                  barSize={24}
                >
                  {monthlyTrendData.map((entry, idx) => (
                    <Cell 
                      key={`cell-${idx}`} 
                      fill={RETRO_COLORS[idx % RETRO_COLORS.length]} 
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-300 text-xs font-bold">
              {t('no_expense_yet')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default PersonalAnalysisView;
