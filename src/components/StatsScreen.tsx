import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ArrowRight, TrendingUp, Check, RotateCcw } from 'lucide-react';
import { Member, Expense, Debt } from '../types';
import { CATEGORIES, RETRO_COLORS } from '../constants';
import { calculateSettlement, cn } from '../lib/utils';
import { AVATARS } from './AvatarGrid';

interface StatsScreenProps {
  members: Member[];
  expenses: Expense[];
  groupName?: string;
}

const SwipeableDebtItem: React.FC<{ 
  debt: Debt; 
  members: Member[]; 
  isSettled: boolean; 
  onToggle: () => void;
  index: number;
}> = ({ debt, members, isSettled, onToggle, index }) => {
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
          "bg-white p-4 flex items-center justify-between relative z-10 transition-colors duration-300",
          isSettled ? "bg-green-50" : "bg-white"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[18px] mb-0.5">
              {AVATARS.find(a => a.id === fromMember?.avatar)?.emoji || "👤"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase mb-0.5 whitespace-nowrap">付款方</span>
            <span className="text-[13px] font-extrabold text-black truncate w-16 text-center">{fromMember?.name}</span>
          </div>
          
          <div className="flex flex-col items-center justify-center px-1">
            <ArrowRight size={18} className={cn("transition-colors", isSettled ? "text-green-300" : "text-gray-200")} />
          </div>

          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-[18px] mb-0.5">
              {AVATARS.find(a => a.id === toMember?.avatar)?.emoji || "👤"}
            </span>
            <span className="text-[11px] font-bold text-slate-400 uppercase mb-0.5 whitespace-nowrap">收錢方</span>
            <span className="text-[13px] font-extrabold text-black truncate w-16 text-center">{toMember?.name}</span>
          </div>
        </div>

        <div className="text-right">
          <span className={cn(
            "block text-[10px] font-bold uppercase mb-0.5 transition-colors",
            isSettled ? "text-green-600" : "text-[var(--color-ios-blue)]"
          )}>
            {isSettled ? "已平帳" : "應轉帳"}
          </span>
          <span className={cn(
            "text-xl font-black transition-colors",
            isSettled ? "text-green-600" : "text-[var(--color-ios-blue)]"
          )}>${debt.amount}</span>
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

export default function StatsScreen({ members, expenses, groupName }: StatsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [settledDebtKeys, setSettledDebtKeys] = useState<Set<string>>(new Set());

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

  // 計算分類圓餅圖資料
  const categoryData = CATEGORIES.map(cat => {
    const total = expenses
      .filter(exp => exp.category === cat.id)
      .reduce((sum, exp) => sum + exp.totalAmount, 0);
    return { name: cat.label, value: total, color: cat.color };
  }).filter(d => d.value > 0);

  // 計算每個人總共花了多少錢 (此處定義為：每個人應負擔的總額)
  const memberSpending = members.map(m => {
    const total = expenses.reduce((sum, exp) => {
      const split = exp.splits.find(s => s.memberId === m.id);
      return sum + (split?.amount || 0);
    }, 0);
    return { ...m, total };
  });

  const settlements = calculateSettlement(members, expenses);

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-1 pt-4 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-black tracking-tight">{groupName || '未命名群組'}</h1>
        <span className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase">結算與統計分析</span>
      </header>

      {/* Pie Chart Section */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider px-1">支出分類統計</h2>
        <div className="ios-card p-6 min-h-[300px] flex flex-col items-center justify-center">
          {categoryData.length > 0 ? (
            <>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
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
              </div>
              <div className="grid grid-cols-3 gap-y-4 gap-x-6 mt-6 w-full">
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
              尚無統計數據
            </div>
          )}
        </div>
      </section>

      {/* Member spending list with Accordion */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider px-1">個人應付總計</h2>
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
                                <span className="text-[10px] font-bold text-gray-500">{cat.label}</span>
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
                          <span>消費明細</span>
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
                                        <span>{CATEGORIES.find(c => c.id === exp.category)?.label} | {new Date(exp.date).toLocaleDateString()}</span>
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
                        <span className="text-[11px] text-gray-400 italic">尚無相關帳單</span>
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
        <h2 className="text-[11px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider px-1">欠債細節</h2>
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
              />
            ))}
          </div>
        ) : (
          <div className="ios-card py-10 text-center">
            <span className="text-sm font-medium text-slate-300">所有債務已清空，目前很平衡！</span>
          </div>
        )}
      </section>
    </div>
  );
}
