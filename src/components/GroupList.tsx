import React, { useState, useRef } from 'react';
import { ChevronDown, Trash2, Users, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Group } from '../types';
import { SectionTitle, EmptyState } from './SharedUI';
import { motion, AnimatePresence } from 'motion/react';
import CurrencyPickerModal from './CurrencyPickerModal';

interface GroupListProps {
  groups: Group[];
  onSelectGroup: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onStartCreate: () => void;
  onUpdateGroup?: (group: Group) => void;
}

export default function GroupList({ groups, onSelectGroup, onDeleteGroup, onStartCreate, onUpdateGroup }: GroupListProps) {
  const { t, i18n } = useTranslation();
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  
  const [selectedGroupForCurrency, setSelectedGroupForCurrency] = useState<Group | null>(null);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const timerRef = useRef<any>(null);
  const isLongPressRef = useRef<boolean>(false);

  const handleStart = (group: Group) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectedGroupForCurrency(group);
      setIsCurrencyPickerOpen(true);
      if (navigator.vibrate) {
        navigator.vibrate(60);
      }
    }, 600);
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleClick = (group: Group) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    onSelectGroup(group.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle 
        title={t('my_groups')} 
        rightAction={
          <button 
            onClick={onStartCreate}
            className="text-sm font-bold text-[#4285F4] active:opacity-50"
          >
            {t('create')}
          </button>
        }
      />

      <AnimatePresence mode="popLayout">
        {groups.length === 0 ? (
          <EmptyState 
            description={t('click_create_to_start')}
            title={t('no_groups')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="ios-card group"
              >
                <div className="p-4 flex items-center justify-between">
                  <button 
                    onMouseDown={() => handleStart(group)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={() => handleStart(group)}
                    onTouchEnd={handleEnd}
                    onTouchMove={handleEnd}
                    onClick={() => handleClick(group)}
                    className="flex-1 flex items-center gap-4 text-left outline-none select-none active:scale-[0.99] transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#EBF4FF] flex items-center justify-center">
                      <Users size={24} className="text-[#4285F4]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[17px] text-black">{group.name}</span>
                      <div className="flex items-center gap-2 text-[12px] text-[#8E8E93] font-medium">
                        <span>{t('members_count', { count: group.members.length })}</span>
                        <span>·</span>
                        <span>{group.currency}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(group.createdAt).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setDeletingGroupId(group.id)}
                    className="p-2 text-[#C7C7CC] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* iOS Style Action Sheet for Deletion */}
      <AnimatePresence>
        {deletingGroupId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingGroupId(null)}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] p-4 pb-12 flex flex-col gap-3 items-center"
            >
              <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 text-center border-b border-gray-200">
                  <p className="text-[13px] text-[#8E8E93] font-medium leading-tight">
                    {t('delete_group_confirm')}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    onDeleteGroup(deletingGroupId);
                    setDeletingGroupId(null);
                  }}
                  className="w-full p-4 text-[#FF3B30] text-[20px] font-medium active:bg-gray-100 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
              <button 
                onClick={() => setDeletingGroupId(null)}
                className="w-full max-w-sm bg-white p-4 text-[#007AFF] text-[20px] font-bold rounded-2xl shadow-lg active:bg-gray-100 transition-colors"
              >
                {t('cancel')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CurrencyPickerModal
        isOpen={isCurrencyPickerOpen}
        onClose={() => {
          setIsCurrencyPickerOpen(false);
          setSelectedGroupForCurrency(null);
        }}
        selectedCode={selectedGroupForCurrency?.currency || 'USD'}
        onSelect={(code) => {
          if (onUpdateGroup && selectedGroupForCurrency) {
            onUpdateGroup({
              ...selectedGroupForCurrency,
              currency: code
            });
          }
        }}
        title={i18n.language === 'zh' ? '重新選擇結算幣別' : 'Change Settlement Currency'}
      />
    </div>
  );
}
