import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Expense } from '../types';
import { getCategoryById, cn, isChineseLocale } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface SwipeableExpenseItemProps {
  exp: Expense;
  onDelete: (id: string) => void;
  onEdit: (exp: Expense) => void;
  currency?: string;
  showPayer?: boolean;
  payerEmoji?: string;
  payerName?: string;
  isPersonal?: boolean;
  exchangeRate?: number;
  activeSwipeId?: string | null;
  onSwipeChange?: (id: string | null) => void;
}

const SwipeableExpenseItem: React.FC<SwipeableExpenseItemProps> = React.memo(({
  exp,
  onDelete,
  onEdit,
  currency = '$',
  showPayer = false,
  payerEmoji,
  payerName,
  isPersonal = false,
  exchangeRate,
  activeSwipeId,
  onSwipeChange
}) => {
  const { t, i18n } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const x = useMotionValue(0);
  const isDraggingRef = useRef(false);

  const deleteOpacity = useTransform(x, [0, 60], [0, 1]);
  const deleteScale = useTransform(x, [0, 60], [0.5, 1]);

  const editOpacity = useTransform(x, [0, -60], [0, 1]);
  const editScale = useTransform(x, [0, -60], [0.5, 1]);

  // Collapse automatically when another item is swiped open
  useEffect(() => {
    if (activeSwipeId !== undefined && activeSwipeId !== exp.id && x.get() !== 0) {
      animate(x, 0, { type: 'spring', bounce: 0, duration: 0.25 });
    }
  }, [activeSwipeId, exp.id, x]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwipeChange?.(null);
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.25 });
    setShowDeleteConfirm(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwipeChange?.(null);
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.25 });
    onEdit(exp);
  };

  const handleCardClick = () => {
    if (isDraggingRef.current) return;
    if (Math.abs(x.get()) > 5) {
      animate(x, 0, { type: 'spring', bounce: 0, duration: 0.25 });
      onSwipeChange?.(null);
      return;
    }
    onEdit(exp);
  };

  const category = getCategoryById(exp.category);
  const formattedTotal = exp.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className={cn(
      "relative overflow-hidden bg-white",
      isPersonal ? "ios-card shadow-none border border-gray-100" : "border-b border-gray-50 last:border-none"
    )}>
      {/* Delete Background (Visible when swiping right) */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 left-0 w-20 bg-red-500 flex items-center justify-center p-4"
      >
        <motion.button
          type="button"
          style={{ scale: deleteScale }}
          onClick={handleDelete}
          aria-label={t('delete')}
          className="w-full h-full flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
        >
          <Trash2 size={20} strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      {/* Edit Background (Left Swipe) */}
      <motion.div
        style={{ opacity: editOpacity }}
        className="absolute inset-y-0 right-0 w-20 bg-[#4285F4] flex items-center justify-center p-4"
      >
        <motion.button
          type="button"
          style={{ scale: editScale }}
          onClick={handleEdit}
          aria-label={t('edit')}
          className="w-full h-full flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
        >
          <Pencil size={20} strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.1}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onDragStart={() => {
          isDraggingRef.current = true;
        }}
        onDragEnd={(_, info) => {
          setTimeout(() => {
            isDraggingRef.current = false;
          }, 50);
          if (info.offset.x > 40 || info.velocity.x > 300) {
            animate(x, 80, { type: 'spring', bounce: 0.3, duration: 0.4 });
            onSwipeChange?.(exp.id);
          } else if (info.offset.x < -40 || info.velocity.x < -300) {
            animate(x, -80, { type: 'spring', bounce: 0.3, duration: 0.4 });
            onSwipeChange?.(exp.id);
          } else {
            animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
            if (activeSwipeId === exp.id) onSwipeChange?.(null);
          }
        }}
        onClick={handleCardClick}
        className={cn(
          "bg-white relative z-10 transition-colors active:bg-gray-50 flex items-center justify-between cursor-pointer",
          isPersonal ? "py-2.5 px-4" : "ios-grouped-item border-none"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-full flex items-center justify-center text-xl shadow-sm",
              isPersonal ? "w-9 h-9" : ""
            )}
            style={{ backgroundColor: isPersonal ? category.color + '15' : 'transparent' }}
          >
            {category.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] text-black">{exp.description}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] font-medium">
              {showPayer && (
                <>
                  <span>{payerEmoji || "👤"}</span>
                  <span>{payerName} {t('paid')} · </span>
                </>
              )}
              <span>
                {new Date(exp.date).toLocaleDateString(isChineseLocale(i18n.language) ? 'zh-TW' : 'en-US')}
              </span>
              {isPersonal && exp.notes && (
                <>
                  <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                  <span className="truncate max-w-[120px]">{exp.notes}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1">
            <span className={cn(
              "font-black text-black text-right flex items-baseline gap-0.5",
              isPersonal ? "text-base" : "text-[15px] underline decoration-[#4285F4] decoration-2 underline-offset-4"
            )}>
              {exp.originalCurrency ? (
                exp.originalCurrency === '$' ? (
                  `$${formattedTotal}`
                ) : (
                  <>
                    <span>{formattedTotal}</span>
                    <span className="text-[10px] font-bold text-gray-450 select-none">{exp.originalCurrency}</span>
                  </>
                )
              ) : (
                currency === '$' ? (
                  `$${formattedTotal}`
                ) : (
                  <>
                    <span>{formattedTotal}</span>
                    <span className="text-[10px] font-bold text-gray-450 select-none">{currency}</span>
                  </>
                )
              )}
            </span>
            {isPersonal && <ChevronRight size={16} className="text-[#C7C7CC]" />}
          </div>
          {isPersonal && exp.originalCurrency && exp.originalCurrency !== currency && exchangeRate && (
            <span className="text-[10px] font-bold text-gray-400 mr-5 flex items-baseline gap-0.5 justify-end">
              <span>≈</span>
              {currency === '$' ? (
                `$${(exp.totalAmount * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
              ) : (
                <>
                  <span>{(exp.totalAmount * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                  <span className="text-[8px] font-bold select-none">{currency}</span>
                </>
              )}
            </span>
          )}
        </div>
      </motion.div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showDeleteConfirm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 z-[201] p-4 pb-12 flex flex-col gap-3 items-center"
              >
                <div className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 text-center border-b border-gray-200">
                    <p className="text-[13px] text-[#8E8E93] font-medium leading-tight">
                      {t('delete_expense_confirm', { name: exp.description || getCategoryById(exp.category).id })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      onDelete(exp.id);
                    }}
                    className="w-full p-4 text-[#FF3B30] text-[20px] font-medium active:bg-gray-100 transition-colors"
                  >
                    {t('delete')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full max-w-sm bg-white p-4 text-[#007AFF] text-[20px] font-bold rounded-2xl shadow-lg active:bg-gray-100 transition-colors"
                >
                  {t('cancel')}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

export default SwipeableExpenseItem;
