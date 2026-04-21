import React, { useState } from 'react';
import { Plus, Users, ReceiptText, ArrowLeft, UserPlus, CheckCircle2, Trash2, X, Calculator } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
                  {group.members.find(m => m.id === exp.payerId)?.name} {t('paid')} · {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
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
  const { t, i18n } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [currentView, setCurrentView] = useState<'details' | 'settlement'>('details');
  const dragControls = useDragControls();

  const isDeepView = currentView !== 'details';

  const handleBack = () => {
    if (currentView !== 'details') {
      setCurrentView('details');
    } else {
      onBack();
    }
  };

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
            setCurrentView('details');
          }
        }}
        className="flex flex-col gap-2 min-h-screen bg-transparent touch-action-none sm:touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      >
        <header className="px-1 pt-8 flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('details')} 
            className="flex items-center gap-2 text-[#4285F4] font-bold active:scale-95 transition-all"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
            <span className="text-[15px]">{t('back_to_expenses')}</span>
          </button>
        </header>

        <StatsScreen 
          members={group.members} 
          expenses={group.expenses} 
          groupName={group.name} 
          currentCurrency={group.currency}
        />
      </motion.div>
    );
  }

  return (
    <motion.div 
      drag={isDeepView ? false : "x"}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.15 }}
      onPointerDown={(e) => {
        if (e.clientX < 40 && !isDeepView) {
          dragControls.start(e);
        }
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80 && info.velocity.x > 300) {
          onBack();
        }
      }}
      className="flex flex-col gap-6 pb-24 min-h-screen bg-transparent touch-action-none sm:touch-pan-y"
      style={{ touchAction: 'pan-y' }}
    >
      <header className="px-1 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-black" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold text-black tracking-tight">{group.name}</h1>
            <span className="text-[10px] font-bold text-[var(--color-ios-grey)] uppercase tracking-wider">
              {currentView === 'details' ? t('group_expenses') : t('settlement_stats')}
            </span>
          </div>
        </div>
        {currentView === 'details' && (
          <button 
            onClick={() => setIsManagingMembers(!isManagingMembers)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all",
              isManagingMembers ? "bg-[#EBF4FF] text-[#4285F4]" : "bg-white text-gray-500"
            )}
          >
            <UserPlus size={20} />
          </button>
        )}
      </header>

      <div className="flex flex-col gap-8">
        {/* Member List Card */}
        <section className="flex flex-col gap-2">
          <div className="ios-card overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-[17px] font-bold text-black tracking-tight">{t('group_members')}</h2>
                  <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide">
                    {t('members_count', { count: group.members.length })} · {group.currency}
                  </span>
                </div>
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
                          {t('add_global_members_first')}
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
                        <span className="text-[12px] text-[#8E8E93] font-medium px-1">{t('select_members_first')}</span>
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
            <h2 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{t('group_expenses')}</h2>
          </div>

          <div className="flex gap-2 px-1">
            <button 
              disabled={group.members.length === 0}
              onClick={() => setIsModalOpen(true)}
              className="flex-[2.5] h-11 bg-[#4285F4] text-white rounded-xl font-bold text-[14px] shadow-sm shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>{t('add_bill')}</span>
            </button>
            <button 
              disabled={group.expenses.length === 0}
              onClick={() => setCurrentView('settlement')}
              className="flex-1 h-11 bg-[#F2F2F7] text-[#4285F4] rounded-xl font-bold text-[14px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Calculator size={18} strokeWidth={2.5} />
              <span>{t('settlement')}</span>
            </button>
          </div>

          <div className="ios-card overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {group.expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-1">
                    <ReceiptText size={24} className="text-gray-200" />
                  </div>
                  <span className="font-bold text-sm text-black">{t('no_bill')}</span>
                  <span className="text-[12px] text-[#8E8E93] leading-relaxed">
                    {group.members.length > 0 ? t('start_splitting') : t('add_members_first')}
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
    </motion.div>
  );
}
