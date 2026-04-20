import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CURRENCIES } from '../constants';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface CurrencyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode: string;
  onSelect: (code: string) => void;
  excludeCode?: string;
  title?: string;
}

export default function CurrencyPickerModal({ 
  isOpen, 
  onClose, 
  selectedCode, 
  onSelect,
  excludeCode,
  title = "選擇幣別"
}: CurrencyPickerModalProps) {
  const filteredCurrencies = CURRENCIES.filter(c => c.code !== excludeCode);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-[var(--color-ios-bg)] w-full max-w-lg rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden"
          >
            {/* Drag Handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full z-[110]" />

            <div className="p-4 pt-6 flex justify-between items-center border-b border-[var(--color-ios-separator)] bg-white/80 backdrop-blur-md">
              <span className="text-[17px] font-bold ml-2">{title}</span>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-90 transition-all"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 ios-scrollbar">
              <div className="ios-card">
                {filteredCurrencies.map((c) => {
                  const isSelected = selectedCode === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => {
                        onSelect(c.code);
                        onClose();
                      }}
                      className={cn(
                        "w-full ios-grouped-item py-4 outline-none",
                        isSelected && "bg-blue-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg font-bold">
                          {c.code.substring(0, 1)}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className={cn("text-[15px] font-bold", isSelected ? "text-[var(--color-ios-blue)]" : "text-black")}>
                            {c.name}
                          </span>
                          <span className="text-[11px] font-bold text-gray-400 uppercase">{c.code}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-ios-blue)]" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-6" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
