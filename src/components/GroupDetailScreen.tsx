import React, { useState } from 'react';
import { Plus, Users, ReceiptText, ArrowLeft, UserPlus, CheckCircle2, Trash2, X, Calculator } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import AvatarGrid, { AVATARS } from './AvatarGrid';
import { Member, Expense, Group } from '../types';
import CreateExpenseModal from './CreateExpenseModal';
import StatsScreen from './StatsScreen';
import { CATEGORIES } from '../constants';
import { cn } from '../lib/utils';

interface GroupDetailScreenProps {
  group: Group;
  onUpdateGroup: (group: Group) => void;
  onBack: () => void;
  allMembers: Member[];
}

const SwipeableExpenseItem: React.FC<{ exp: Expense; group: Group; onDelete: (id: string) => void }> = ({ exp, group, onDelete }) => {
  const x = useMotionValue(0);
  // Transform x position to background opacity and button scale
  const opacity = useTransform(x, [0, 60], [0, 1]);
  const scale = useTransform(x, [0, 60], [0.5, 1]);

  return (
    <div className="relative overflow-hidden bg-white border-b border-gray-50 last:border-none">
      {/* Delete Background (Visible when swiping right) */}
      <motion.div 
        style={{ opacity }}
        className="absolute inset-y-0 left-0 w-20 bg-red-500 flex items-center justify-center"
      >
        <motion.button 
          style={{ scale }}
          onClick={() => onDelete(exp.id)}
          className="w-full h-full flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <X size={24} strokeWidth={3} />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 80 }}
        dragElastic={0.1}
        className="bg-white relative z-10"
      >
        <div className="ios-grouped-item cursor-grab active:cursor-grabbing border-none">
          <div className="flex items-center gap-3">
            <span className="text-xl">{CATEGORIES.find(c => c.id === exp.category)?.icon}</span>
            <div className="flex flex-col">
              <span className="font-bold text-[15px]">{exp.description}</span>
              <div className="flex items-center gap-1 text-[10px] text-[#8E8E93]">
                <span>
                  {AVATARS.find(a => a.id === group.members.find(m => m.id === exp.payerId)?.avatar)?.emoji || "👤"}
                </span>
                <span>
                  {group.members.find(m => m.id === exp.payerId)?.name} 付款 · {new Date(exp.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-black text-[15px] underline decoration-[#4285F4] decoration-2 underline-offset-4">
              ${exp.totalAmount}
            </span>
            <span className="text-[10px] text-[#8E8E93] font-bold">{group.currency}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function GroupDetailScreen({ group, onUpdateGroup, onBack, allMembers }: GroupDetailScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [currentView, setCurrentView] = useState<'details' | 'settlement'>('details');

  const toggleMemberInGroup = (member: Member) => {
    const isAlreadyInGroup = group.members.some(m => m.id === member.id);
    let updatedMembers;
    
    if (isAlreadyInGroup) {
      updatedMembers = group.members.filter(m => m.id !== member.id);
    } else {
      updatedMembers = [...group.members, member];
    }

    onUpdateGroup({
      ...group,
      members: updatedMembers
    });
  };

  const handleAddExpense = (e: Expense) => {
    onUpdateGroup({
      ...group,
      expenses: [...group.expenses, e]
    });
  };

  const handleDeleteExpense = (id: string) => {
    onUpdateGroup({
      ...group,
      expenses: group.expenses.filter(e => e.id !== id)
    });
  };

  if (currentView === 'settlement') {
    return (
      <div className="flex flex-col gap-2">
        <header className="px-1 pt-8 flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('details')} 
            className="flex items-center gap-2 text-[#4285F4] font-bold active:scale-95 transition-all"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
            <span className="text-[15px]">返回帳單紀錄</span>
          </button>
        </header>

        <StatsScreen 
          members={group.members} 
          expenses={group.expenses} 
          groupName={group.name} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="px-1 pt-8 flex items-center gap-4">
        <button onClick={onBack} className="text-[#8E8E93]">
          <ArrowLeft size={28} strokeWidth={2.5} />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-3xl font-extrabold text-black tracking-tight">{group.name}</h1>
          <span className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wide">
            {group.members.length} 位成員 · {group.currency}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {/* Member List Card */}
        <section className="flex flex-col gap-2">
          <div className="ios-card overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-[17px] font-bold text-black tracking-tight">團體成員</h2>
                </div>
                <button 
                  onClick={() => setIsManagingMembers(!isManagingMembers)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all",
                    isManagingMembers 
                      ? "bg-[#EBF4FF] text-[#4285F4]" 
                      : "border border-[#4285F4] text-[#4285F4]"
                  )}
                >
                  <UserPlus size={16} strokeWidth={2.5} />
                  <span>管理</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <AnimatePresence mode="popLayout">
                  {isManagingMembers ? (
                    <motion.div
                      key="managing"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-1 bg-gray-50/50 rounded-2xl p-2 overflow-hidden"
                    >
                      {allMembers.length === 0 ? (
                        <div className="py-4 px-2 text-center text-xs text-[#8E8E93]">
                          請先在外面新增全域成員名單
                        </div>
                      ) : (
                        allMembers.map((member) => {
                          const isSelected = group.members.some(m => m.id === member.id);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleMemberInGroup(member)}
                              className={cn(
                                "flex items-center justify-between py-2.5 px-4 rounded-xl transition-all duration-200 outline-none",
                                isSelected ? "bg-white shadow-sm" : "hover:bg-white/50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">
                                  {AVATARS.find(a => a.id === member.avatar)?.emoji || '👤'}
                                </span>
                                <span className={cn(
                                  "text-[15px] font-bold transition-colors",
                                  isSelected ? "text-black" : "text-gray-500"
                                )}>
                                  {member.name}
                                </span>
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected 
                                  ? "bg-[#4285F4] border-[#4285F4] scale-100" 
                                  : "border-gray-200 bg-transparent"
                              )}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 pt-1"
                    >
                      {group.members.length === 0 ? (
                        <span className="text-[12px] text-[#8E8E93] font-medium px-1">請先選擇成員</span>
                      ) : (
                        group.members.map((member) => (
                          <motion.div 
                            key={member.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="bg-[#F2F2F7] pl-2 pr-3 py-1.5 rounded-full flex items-center gap-2 border border-blue-50/30 shadow-sm"
                          >
                            <span className="text-base leading-none">
                              {AVATARS.find(a => a.id === member.avatar)?.emoji || '👤'}
                            </span>
                            <span className="text-[13px] font-bold text-gray-700">{member.name}</span>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Expenses Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">群組帳單紀錄</h2>
          </div>

          <div className="flex gap-2 px-1">
            <button 
              disabled={group.members.length === 0}
              onClick={() => setIsModalOpen(true)}
              className="flex-[2.5] h-11 bg-[#4285F4] text-white rounded-xl font-bold text-[14px] shadow-sm shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>新增帳單</span>
            </button>
            <button 
              disabled={group.expenses.length === 0}
              onClick={() => setCurrentView('settlement')}
              className="flex-1 h-11 bg-[#F2F2F7] text-[#4285F4] rounded-xl font-bold text-[14px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Calculator size={18} strokeWidth={2.5} />
              <span>結算</span>
            </button>
          </div>

          <div className="ios-card overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {group.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-1">
                    <ReceiptText size={24} className="text-gray-200" />
                  </div>
                  <span className="font-bold text-sm text-black">尚無帳單</span>
                  <span className="text-[12px] text-[#8E8E93] leading-relaxed">
                    {group.members.length > 0 ? "點擊「新增帳單」開始分錢" : "請先新增成員"}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {group.expenses.slice().reverse().map((exp) => (
                    <SwipeableExpenseItem 
                      key={exp.id} 
                      exp={exp} 
                      group={group} 
                      onDelete={handleDeleteExpense} 
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      <CreateExpenseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        members={group.members}
        onSave={handleAddExpense}
      />
    </div>
  );
}
