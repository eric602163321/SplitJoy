import React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Pencil, Trash2, X, ChevronRight } from 'lucide-react';
import { Expense } from '../types';
import { getCategoryById } from '../lib/utils';
import { AVATARS } from './AvatarGrid';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface SwipeableExpenseItemProps {
  exp: Expense;
  onDelete: (id: string) => void;
  onEdit: (exp: Expense) => void;
  currency?: string;
  showPayer?: boolean;
  payerEmoji?: string;
  payerName?: string;
  isPersonal?: boolean;
}

const SwipeableExpenseItem: React.FC<SwipeableExpenseItemProps> = React.memo(({ 
  exp, 
  onDelete, 
  onEdit, 
  currency = '$', 
  showPayer = false,
  payerEmoji,
  payerName,
  isPersonal = false
}) => {
  const { t, i18n } = useTranslation();
  const x = useMotionValue(0);
  
  // Right swipe (Delete)
  const deleteOpacity = useTransform(x, [0, 60], [0, 1]);
  const deleteScale = useTransform(x, [0, 60], [0.5, 1]);
  
  // Left swipe (Edit)
  const editOpacity = useTransform(x, [0, -60], [0, 1]);
  const editScale = useTransform(x, [0, -60], [0.5, 1]);

  const handleDelete = () => {
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 }).then(() => {
      onDelete(exp.id);
    });
  };

  const handleEdit = () => {
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 }).then(() => {
      onEdit(exp);
    });
  };

  const category = getCategoryById(exp.category);

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
          style={{ scale: deleteScale }}
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          {isPersonal ? <Trash2 size={20} strokeWidth={2.5} /> : <X size={20} strokeWidth={3} />}
        </motion.button>
      </motion.div>

      {/* Edit Background (Left Swipe) */}
      <motion.div 
        style={{ opacity: editOpacity }}
        className="absolute inset-y-0 right-0 w-20 bg-[#4285F4] flex items-center justify-center p-4"
      >
        <motion.button 
          style={{ scale: editScale }}
          onClick={handleEdit}
          className="w-full h-full flex items-center justify-center text-white active:scale-90 transition-transform"
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
        onDragEnd={(_, info) => {
          if (info.offset.x > 40 || info.velocity.x > 300) {
            animate(x, 80, { type: 'spring', bounce: 0.3, duration: 0.4 });
          } else if (info.offset.x < -40 || info.velocity.x < -300) {
            animate(x, -80, { type: 'spring', bounce: 0.3, duration: 0.4 });
          } else {
            animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
          }
        }}
        className={cn(
          "bg-white relative z-10 transition-colors active:bg-gray-50 flex items-center justify-between",
          isPersonal ? "py-2.5 px-4" : "ios-grouped-item border-none cursor-grab active:cursor-grabbing"
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
                {new Date(exp.date).toLocaleDateString(i18n.language === 'zh' ? 'zh-TW' : 'en-US')}
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
              "font-black text-black text-right",
              isPersonal ? "text-base" : "text-[15px] underline decoration-[#4285F4] decoration-2 underline-offset-4"
            )}>
              {exp.originalCurrency 
                ? (exp.originalCurrency === '$' ? `$${exp.totalAmount.toLocaleString()}` : `${exp.totalAmount.toLocaleString()} ${exp.originalCurrency}`)
                : (currency === '$' ? `$${exp.totalAmount.toLocaleString()}` : `${exp.totalAmount.toLocaleString()} ${currency}`)
              }
            </span>
            {isPersonal && <ChevronRight size={16} className="text-[#C7C7CC]" />}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default SwipeableExpenseItem;
