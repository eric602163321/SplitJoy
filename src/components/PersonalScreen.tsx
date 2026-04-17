import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';

export default function PersonalScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadSampleData = () => {
    const sampleExpenses: Expense[] = [
      { 
        id: '1', 
        totalAmount: 150, 
        description: '午餐', 
        date: new Date().toISOString(),
        category: 'food',
        payerId: 'self',
        splitType: 'equal',
        splits: [{ memberId: 'self', amount: 150 }]
      },
      { 
        id: '2', 
        totalAmount: 65, 
        description: '飲料', 
        date: new Date().toISOString(),
        category: 'food',
        payerId: 'self',
        splitType: 'equal',
        splits: [{ memberId: 'self', amount: 65 }]
      },
      { 
        id: '3', 
        totalAmount: 500, 
        description: '加油', 
        date: new Date().toISOString(),
        category: 'transport',
        payerId: 'self',
        splitType: 'equal',
        splits: [{ memberId: 'self', amount: 500 }]
      },
    ];
    setExpenses(sampleExpenses);
  };

  const total = expenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="px-1 pt-8">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">個人記帳</h1>
      </header>

      <div className="flex flex-col gap-6">
        {/* Total Card */}
        <section>
          <div className="ios-card flex flex-col items-center justify-center py-6 gap-1">
            <span className="text-sm font-semibold text-[var(--color-ios-grey)] uppercase tracking-wide">總支出</span>
            <span className="text-5xl font-black text-black">${total.toLocaleString()}</span>
          </div>
        </section>

        <button className="ios-btn-primary flex items-center justify-center gap-2">
          <Plus size={20} strokeWidth={3} />
          新增支出
        </button>

        {/* List Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-[var(--color-ios-grey)] uppercase tracking-wider">最近紀錄</h2>
            <button 
              onClick={loadSampleData}
              className="text-sm font-medium text-[var(--color-ios-blue)] active:opacity-50"
            >
              載入模擬資料
            </button>
          </div>
          
          <div className="ios-card">
            <AnimatePresence mode="popLayout">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                    <Sparkles size={24} className="text-gray-200" />
                  </div>
                  <span className="text-[var(--color-ios-grey)] font-medium text-sm leading-relaxed">
                    尚無記錄，點擊上方按鈕載入模擬資料看看效果
                  </span>
                </div>
              ) : (
                <div className="flex flex-col">
                  {expenses.map((exp) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={exp.id} 
                      className="ios-grouped-item"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-[17px] text-black">{exp.description}</span>
                        <span className="text-sm text-[var(--color-ios-grey)]">{new Date(exp.date).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold text-[17px] text-black">
                        ${exp.totalAmount.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
