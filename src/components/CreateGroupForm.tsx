import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { motion, useDragControls } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Group } from '../types';
import { cn } from '../lib/utils';
import { CURRENCIES } from '../constants';
import CurrencyPickerModal from './CurrencyPickerModal';

interface CreateGroupFormProps {
  onAddGroup: (group: Group) => void;
  onCancel: () => void;
}

export default function CreateGroupForm({ onAddGroup, onCancel }: CreateGroupFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    const finalCurrency = customCurrency.trim() || currency;
    const newGroup: Group = {
      id: Date.now().toString(),
      name: name.trim(),
      currency: finalCurrency,
      members: [],
      expenses: [],
      createdAt: new Date().toISOString()
    };
    onAddGroup(newGroup);
  };

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
          onCancel();
        }
      }}
      className="flex flex-col gap-6 min-h-screen bg-transparent"
    >
      <div className="flex items-center gap-2 px-1">
        <button onClick={onCancel} className="text-[#4285F4]">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[14px] font-bold text-[#8E8E93] uppercase tracking-wider">{t('create_group')}</h2>
      </div>

      <div className="ios-card p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <input 
            ref={nameInputRef}
            type="text" 
            placeholder={t('group_name_placeholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#F2F2F7] border-none py-3 px-4 rounded-2xl text-[15px] placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#4285F4] transition-all"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-bold text-[#8E8E93] px-1">{t('default_currency')}</label>
          <div className="relative">
            <button 
              onClick={() => setShowCurrencyPicker(true)}
              className="w-full bg-[#F2F2F7] flex items-center justify-between py-3 px-4 rounded-2xl text-[15px] text-black outline-none active:bg-gray-200 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">
                  {(() => {
                    const found = CURRENCIES.find(c => c.code === currency);
                    return found ? t(found.name) : currency;
                  })()}
                </span>
                <span className="text-[10px] uppercase font-bold text-[#8E8E93]">{currency}</span>
              </div>
              <ChevronDown size={18} className="text-[#C7C7CC]" />
            </button>
            
            <CurrencyPickerModal 
              isOpen={showCurrencyPicker}
              onClose={() => setShowCurrencyPicker(false)}
              selectedCode={currency}
              onSelect={(code) => {
                setCurrency(code);
                setCustomCurrency('');
              }}
              title={t('target_currency')}
            />
          </div>

          <input 
            type="text" 
            placeholder={t('custom_currency_placeholder')}
            value={customCurrency}
            onChange={(e) => setCustomCurrency(e.target.value)}
            className="w-full bg-[#F2F2F7] border-none py-3 px-4 rounded-2xl text-[15px] placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#4285F4] transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <button 
            onClick={onCancel}
            className="py-3.5 rounded-2xl font-bold text-[17px] bg-[#F2F2F7] text-black active:opacity-70 transition-all"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "py-3.5 rounded-2xl font-bold text-[17px] text-white active:opacity-70 transition-all shadow-sm",
              name.trim() ? "bg-[#4285F4]" : "bg-[#A0CFFF] opacity-80 cursor-not-allowed"
            )}
          >
            {t('create')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
