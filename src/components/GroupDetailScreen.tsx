import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, ReceiptText, ArrowLeft, UserPlus, Calculator, Share2, Copy, Check, ChevronDown, ChevronRight, AlertCircle, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { AVATARS } from './AvatarGrid';
import { Member, Expense, Group } from '../types';
import CreateExpenseModal from './CreateExpenseModal';
import CurrencyPickerModal from './CurrencyPickerModal';
import StatsScreen from './StatsScreen';
import SwipeableExpenseItem from './SwipeableExpenseItem';
import { ScreenHeader, SectionTitle, EmptyState } from './SharedUI';
import { cn } from '../lib/utils';
import { syncGroupExpenses, migrateLegacyExpensesIfNeeded } from '../lib/firebaseUtils';

interface GroupDetailScreenProps {
  group: Group;
  onUpdateGroup: (group: Group) => Promise<void> | void;
  onBack: () => void;
  allMembers: Member[];
}

export default function GroupDetailScreen({ group, onUpdateGroup, onBack, allMembers }: GroupDetailScreenProps) {
  const { t } = useTranslation();
  const { user, handleLogin, saveGroupExpense, removeGroupExpense } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState(group.name);
  const [editedGroupCurrency, setEditedGroupCurrency] = useState(group.currency);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [currentView, setCurrentView] = useState<'details' | 'settlement'>('details');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInviteExpanded, setIsInviteExpanded] = useState(false);
  const [cloudExpenses, setCloudExpenses] = useState<Expense[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const dragControls = useDragControls();

  // Subscribe to subcollection expenses when signed in & auto-migrate legacy array if present
  useEffect(() => {
    setCloudExpenses(null);
    if (!user) {
      return;
    }

    if (group.expenses && group.expenses.length > 0) {
      migrateLegacyExpensesIfNeeded(group.id, group.expenses).catch(err => {
        console.error('Legacy expenses migration failed:', err);
      });
    }

    const unsubscribe = syncGroupExpenses(
      group.id,
      (items) => {
        setCloudExpenses(items);
      },
      (err) => {
        console.error('Group expenses listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, group.id]);

  // Combine subcollection expenses with legacy expenses fallback during migration
  const activeExpenses: Expense[] = useMemo(() => {
    if (!user) return group.expenses;
    if (cloudExpenses === null) return group.expenses;
    if (cloudExpenses.length === 0 && group.expenses.length > 0) return group.expenses;
    return cloudExpenses;
  }, [user, cloudExpenses, group.expenses]);

  // Merge user's local member presets and current group members (so cloud collaborators appear in Manage Members)
  const selectableMembers: Member[] = useMemo(() => {
    const map = new Map<string, Member>();
    group.members.forEach(m => map.set(m.id, m));
    allMembers.forEach(m => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values());
  }, [group.members, allMembers]);

  // Members referenced in existing bills cannot be removed without breaking settlement math
  const referencedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    activeExpenses.forEach(exp => {
      if (exp.payerId) ids.add(exp.payerId);
      exp.splits.forEach(s => {
        if (s.amount > 0) ids.add(s.memberId);
      });
    });
    return ids;
  }, [activeExpenses]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.id).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?join=${group.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const isDeepView = currentView !== 'details';

  const handleBack = () => {
    if (currentView !== 'details') {
      setCurrentView('details');
    } else {
      onBack();
    }
  };

  const toggleMemberInGroup = async (member: Member) => {
    setActionError(null);
    const isAlreadyInGroup = group.members.some(m => m.id === member.id);

    if (isAlreadyInGroup && referencedMemberIds.has(member.id)) {
      setActionError(t('err_member_has_bills'));
      setTimeout(() => setActionError(null), 3500);
      return;
    }

    const updatedMembers = isAlreadyInGroup
      ? group.members.filter(m => m.id !== member.id)
      : [...group.members, member];

    try {
      await onUpdateGroup({
        ...group,
        members: updatedMembers
      });
    } catch (err) {
      console.error('Failed to update group members:', err);
      setActionError(t('err_save_failed'));
    }
  };

  const handleSaveExpense = async (e: Expense) => {
    setActionError(null);
    try {
      await saveGroupExpense(group.id, e);
      setEditingExpense(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save group expense:', err);
      setActionError(t('err_save_failed'));
    }
  };

  const handleEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (id: string) => {
    setActionError(null);
    try {
      await removeGroupExpense(group.id, id);
    } catch (err) {
      console.error('Failed to delete group expense:', err);
      setActionError(t('err_save_failed'));
    }
  };

  const openEditGroupModal = () => {
    setEditedGroupName(group.name);
    setEditedGroupCurrency(group.currency);
    setActionError(null);
    setIsEditingGroup(true);
  };

  const handleSaveGroupEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = editedGroupName.trim();
    if (!trimmedName || isSavingGroup) return;

    if (trimmedName === group.name && editedGroupCurrency === group.currency) {
      setIsEditingGroup(false);
      return;
    }

    setIsSavingGroup(true);
    setActionError(null);
    try {
      await onUpdateGroup({
        ...group,
        name: trimmedName,
        currency: editedGroupCurrency
      });
      setIsEditingGroup(false);
    } catch (err) {
      console.error('Failed to update group details:', err);
      setActionError(t('err_save_failed'));
    } finally {
      setIsSavingGroup(false);
    }
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
          expenses={activeExpenses}
          groupId={group.id}
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
      <ScreenHeader
        title={group.name}
        subtitle={currentView === 'details' ? t('group_expenses') : t('settlement_stats')}
        leftAction={
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-black" />
          </button>
        }
        rightAction={
          currentView === 'details' && (
            <div className="flex items-center gap-2">
              <button
                onClick={openEditGroupModal}
                aria-label={t('edit_group')}
                className="w-10 h-10 rounded-full bg-white text-gray-500 flex items-center justify-center shadow-sm active:scale-95 transition-all"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setIsManagingMembers(!isManagingMembers)}
                aria-label={t('manage')}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all",
                  isManagingMembers ? "bg-[#EBF4FF] text-[#4285F4]" : "bg-white text-gray-500"
                )}
              >
                <UserPlus size={20} />
              </button>
            </div>
          )
        }
      />

      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                      {selectableMembers.length === 0 ? (
                        <div className="py-4 px-2 text-center text-xs text-[#8E8E93]">
                          {t('add_global_members_first')}
                        </div>
                      ) : (
                        selectableMembers.map((member) => {
                          const isSelected = group.members.some(m => m.id === member.id);
                          const isLocked = isSelected && referencedMemberIds.has(member.id);
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
                                {isLocked && (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                    {t('member_has_bills_tag')}
                                  </span>
                                )}
                              </div>
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected
                                  ? "bg-[#4285F4] border-[#4285F4] scale-100"
                                  : "border-gray-200 bg-transparent",
                                isLocked && "opacity-60"
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

        {/* Collaborative Invitation Card */}
        <section className="flex flex-col gap-2">
          <div className="ios-card overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <button
                onClick={() => setIsInviteExpanded(!isInviteExpanded)}
                className="flex items-center justify-between w-full text-left focus:outline-none select-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#EBF4FF] flex items-center justify-center shrink-0">
                    <Share2 size={16} className="text-[#4285F4]" />
                  </div>
                  <h3 className="text-[16px] font-bold text-black tracking-tight">
                    {t('invite_friends_coedit')}
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: isInviteExpanded ? 180 : 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-[#8E8E93]"
                >
                  <ChevronDown size={18} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isInviteExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: -16 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 0 }}
                    exit={{ height: 0, opacity: 0, marginTop: -16 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="overflow-hidden flex flex-col gap-4"
                  >
                    {user ? (
                      <div className="flex flex-col gap-3 pt-1">
                        <p className="text-[13px] text-gray-500 leading-normal font-medium">
                          {t('invite_friends_desc')}
                        </p>

                        {/* Invite Code */}
                        <div className="bg-[#F2F2F7] p-3 rounded-2xl flex items-center justify-between border border-gray-100">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                              {t('invite_code')}
                            </span>
                            <span className="text-[13px] font-mono font-bold text-black select-all break-all pr-2 truncate">
                              {group.id}
                            </span>
                          </div>
                          <button
                            onClick={handleCopyCode}
                            className={cn(
                              "p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center",
                              copiedCode ? "bg-[#34C759] text-white" : "bg-white hover:bg-gray-100 text-[#4285F4] shadow-sm border border-gray-100"
                            )}
                          >
                            {copiedCode ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.5} />}
                          </button>
                        </div>

                        {/* Invite Link */}
                        <div className="bg-[#F2F2F7] p-3 rounded-2xl flex items-center justify-between border border-gray-100">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                              {t('quick_join_link')}
                            </span>
                            <span className="text-[12px] text-gray-500 font-medium truncate max-w-[180px] sm:max-w-[280px]">
                              {`${window.location.origin}?join=${group.id}`}
                            </span>
                          </div>
                          <button
                            onClick={handleCopyLink}
                            className={cn(
                              "p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center",
                              copiedLink ? "bg-[#34C759] text-white" : "bg-white hover:bg-gray-100 text-[#4285F4] shadow-sm border border-gray-100"
                            )}
                          >
                            {copiedLink ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={2.5} />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pt-1">
                        <p className="text-[13px] text-gray-500 leading-normal font-medium">
                          {t('local_mode_invite_tip')}
                        </p>
                        <button
                          onClick={handleLogin}
                          className="w-full h-11 bg-[#4285F4] text-white rounded-xl font-bold text-[14px] shadow-sm shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Users size={16} />
                          <span>{t('login')}</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Expenses Section */}
        <section className="flex flex-col gap-3">
          <SectionTitle title={t('group_expenses')} />

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
              disabled={activeExpenses.length === 0}
              onClick={() => setCurrentView('settlement')}
              className="flex-1 h-11 bg-[#F2F2F7] text-[#4285F4] rounded-xl font-bold text-[14px] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Calculator size={18} strokeWidth={2.5} />
              <span>{t('settlement')}</span>
            </button>
          </div>

          <div className="ios-card overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              {activeExpenses.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title={t('no_bill')}
                  description={group.members.length > 0 ? t('start_splitting') : t('add_members_first')}
                  className="shadow-none"
                />
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {activeExpenses.slice().reverse().map((exp) => (
                    <SwipeableExpenseItem
                      key={exp.id}
                      exp={exp}
                      onDelete={handleDeleteExpense}
                      onEdit={handleEditExpense}
                      currency={group.currency}
                      showPayer={true}
                      payerEmoji={AVATARS.find(a => a.id === group.members.find(m => m.id === exp.payerId)?.avatar)?.emoji || "👤"}
                      payerName={group.members.find(m => m.id === exp.payerId)?.name || ""}
                      activeSwipeId={activeSwipeId}
                      onSwipeChange={setActiveSwipeId}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        members={group.members}
        onSave={handleSaveExpense}
        initialExpense={editingExpense || undefined}
        groupCurrency={group.currency}
      />

      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditingGroup && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingGroup && setIsEditingGroup(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.form
              onSubmit={handleSaveGroupEdit}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-[var(--color-ios-bg)] w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden pb-8 sm:pb-6"
            >
              <div className="p-4 flex justify-between items-center border-b border-[var(--color-ios-separator)] bg-white/80 backdrop-blur-md">
                <span className="text-[17px] font-bold ml-2">{t('edit_group')}</span>
                <button
                  type="button"
                  disabled={isSavingGroup}
                  onClick={() => setIsEditingGroup(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-90 transition-all"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider px-1">
                    {t('group_name')}
                  </label>
                  <div className="ios-card px-4 py-3">
                    <input
                      type="text"
                      value={editedGroupName}
                      onChange={(e) => setEditedGroupName(e.target.value)}
                      placeholder={t('group_name_placeholder')}
                      maxLength={80}
                      required
                      className="w-full bg-transparent text-[16px] font-bold text-black outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider px-1">
                    {t('default_currency')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCurrencyPickerOpen(true)}
                    className="ios-card px-4 py-3.5 flex items-center justify-between active:bg-gray-50 transition-colors"
                  >
                    <span className="text-[15px] font-bold text-black">{t('change_settlement_currency')}</span>
                    <div className="flex items-center gap-1.5 text-[var(--color-ios-blue)] font-bold">
                      <span>{editedGroupCurrency}</span>
                      <ChevronRight size={16} className="text-[#C7C7CC]" />
                    </div>
                  </button>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isSavingGroup}
                    onClick={() => setIsEditingGroup(false)}
                    className="flex-1 h-12 rounded-2xl bg-white text-gray-600 font-bold text-[15px] border border-gray-200 active:scale-95 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!editedGroupName.trim() || isSavingGroup}
                    className="flex-1 h-12 rounded-2xl bg-[var(--color-ios-blue)] text-white font-bold text-[15px] shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        onClose={() => setIsCurrencyPickerOpen(false)}
        selectedCode={editedGroupCurrency}
        onSelect={setEditedGroupCurrency}
        title={t('change_settlement_currency')}
      />
    </motion.div>
  );
}
