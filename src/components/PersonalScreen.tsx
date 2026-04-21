import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Sparkles, ChevronRight, BarChart3, ArrowLeft, TrendingUp, ChevronDown, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Expense, Member } from '../types';
import { CATEGORIES, RETRO_COLORS } from '../constants';
import { AVATARS } from './AvatarGrid';
import CreateExpenseModal from './CreateExpenseModal';
import { cn } from '../lib/utils';

const SwipeableExpenseItem: React.FC<{
  exp: Expense;
  onDelete: (id: string) => void;
}> = ({ exp, onDelete }) => {
  const { i18n } = useTranslation();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, 60], [0, 1]);
  const deleteScale = useTransform(x, [0, 60], [0.5, 1]);

  const handleDelete = () => {
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 }).then(() => {
      onDelete(exp.id);
    });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative overflow-hidden ios-card shadow-none border border-gray-100"
    >
      {/* Delete Background (Right Swipe) */}
      <motion.div 
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 left-0 w-20 bg-red-500 flex items-center justify-center p-4"
      >
        <motion.button 
          style={{ scale: deleteScale }}
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <Trash2 size={24} strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.1}
        className="bg-white p-4 flex items-center justify-between relative z-10 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm"
            style={{ backgroundColor: CATEGORIES.find(c => c.id === exp.category)?.color + '15' }}
          >
            {CATEGORIES.find(c => c.id === exp.category)?.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] text-black">{exp.description}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--color-ios-grey)]">
                {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
              </span>
              {exp.notes && (
                <>
                  <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                  <span className="text-[11px] font-medium text-[var(--color-ios-grey)] truncate max-w-[120px]">{exp.notes}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-[17px] text-black">
            ${exp.totalAmount.toLocaleString()}
          </span>
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </motion.div>
    </motion.div>
  );
};

interface PersonalScreenProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

export default function PersonalScreen({ expenses, setExpenses }: PersonalScreenProps) {
  const { t, i18n } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const containerRef1 = useRef<HTMLDivElement>(null);
  const containerRef2 = useRef<HTMLDivElement>(null);
  const [hasWidth, setHasWidth] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    if (showAnalysis) {
      // Even after animation, give it a tiny bit of time for layout to settle
      const timer = setTimeout(() => {
        setIsReady(true);
        if (containerRef1.current?.clientWidth || containerRef2.current?.clientWidth) {
          setHasWidth(true);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
      setHasWidth(false);
    }
  }, [showAnalysis]);

  const selfMember: Member = useMemo(() => ({
    id: 'self',
    name: t('me'),
    avatar: AVATARS[0].id
  }), [t]);

  const total = useMemo(() => expenses.reduce((sum, exp) => sum + exp.totalAmount, 0), [expenses]);

  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const value = expenses
        .filter(exp => exp.category === cat.id)
        .reduce((sum, exp) => sum + exp.totalAmount, 0);
      return { 
        name: i18n.language === 'zh' ? cat.label : (t(`cat_${cat.id}`) || cat.label), 
        value, 
        color: cat.color, 
        id: cat.id 
      };
    }).filter(d => d.value > 0);
  }, [expenses, i18n.language]);

  const monthlyTrendData = useMemo(() => {
    const months: Record<string, number> = {};
    expenses.forEach(exp => {
      const date = new Date(exp.date);
      const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
      months[key] = (months[key] || 0) + exp.totalAmount;
    });

    return Object.entries(months)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => {
        const [ya, ma] = a.name.split('/').map(Number);
        const [yb, mb] = b.name.split('/').map(Number);
        return ya !== yb ? ya - yb : ma - mb;
      })
      .slice(-6); // Last 6 months
  }, [expenses]);

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev]);
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

        <div className="flex flex-col gap-6">
          {/* Category Pie Chart */}
          <section className="ios-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              {t('category_ratio')}
            </h3>
            <div className="w-full relative min-h-[160px]" ref={containerRef1}>
              {categoryData.length > 0 && isReady && hasWidth ? (
                <ResponsiveContainer width="100%" aspect={2.0}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={categoryData}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium">{t('no_data')}</div>
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
                      <span className="text-sm font-black text-black">${d.value.toLocaleString()}</span>
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
                          .filter(exp => exp.category === d.id)
                          .map(exp => (
                            <div key={exp.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-xs">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-gray-800">{exp.description}</span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
                                </span>
                              </div>
                              <span className="font-bold text-gray-600">${exp.totalAmount.toLocaleString()}</span>
                            </div>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          {/* Monthly Trend Chart */}
          <section className="ios-card p-6 flex flex-col gap-6">
            <h3 className="text-sm font-bold text-black flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--color-ios-blue)]" />
              {t('monthly_trend')}
            </h3>
            <div className="w-full relative min-h-[160px]" ref={containerRef2}>
              {monthlyTrendData.length > 0 && isReady && hasWidth ? (
                <ResponsiveContainer width="100%" aspect={2}>
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#8E8E93' }}
                      dy={10}
                    />
                    <YAxis hide />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="var(--color-ios-blue)" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: 'var(--color-ios-blue)', strokeWidth: 2, stroke: '#FFF' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium">{t('generating_data')}</div>
              )}
            </div>
          </section>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="px-1 pt-8">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">{t('personal')}</h1>
      </header>

      <div className="flex flex-col gap-6">
        {/* Total Card - Restored large style */}
        <section>
          <div className="ios-card flex flex-col items-center justify-center py-8 gap-1 bg-white shadow-md">
            <span className="text-xs font-bold text-[var(--color-ios-grey)] uppercase tracking-widest">{t('monthly_total')}</span>
            <span className="text-5xl font-black text-black tracking-tighter">${total.toLocaleString()}</span>
          </div>
        </section>

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

        {/* List Section */}
        <section className="flex flex-col gap-3 pb-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">{t('recent_records')}</h2>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout">
              {expenses.length === 0 ? (
                <div className="ios-card flex flex-col items-center justify-center py-12 px-4 text-center gap-2" key="empty">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                    <Sparkles size={24} className="text-gray-200" />
                  </div>
                  <span className="text-[var(--color-ios-grey)] font-medium text-sm leading-relaxed max-w-[200px]">
                    {t('no_expense_yet')}<br/>{t('click_to_start')}
                  </span>
                </div>
              ) : (
                expenses.map((exp) => (
                  <SwipeableExpenseItem 
                    key={exp.id} 
                    exp={exp} 
                    onDelete={handleDeleteExpense} 
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <CreateExpenseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        members={[selfMember]}
        onSave={handleAddExpense}
      />
    </div>
  );
}
