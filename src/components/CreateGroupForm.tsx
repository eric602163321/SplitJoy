import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Group } from '../types';
import { cn } from '../lib/utils';
import { CURRENCIES } from '../constants';
import CurrencyPickerModal from './CurrencyPickerModal';

interface CreateGroupFormProps {
  onAddGroup: (group: Group) => void;
  onCancel: () => void;
}

export default function CreateGroupForm({ onAddGroup, onCancel }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 px-1">
        <button onClick={onCancel} className="text-[#4285F4]">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-[14px] font-bold text-[#8E8E93] uppercase tracking-wider">建立新團體</h2>
      </div>

      <div className="ios-card p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <input 
            ref={nameInputRef}
            type="text" 
            placeholder="輸入團體名稱（如：眠月線登山團）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#F2F2F7] border-none py-3 px-4 rounded-2xl text-[15px] placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#4285F4] transition-all"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-bold text-[#8E8E93] px-1">預設幣別</label>
          <div className="relative">
            <button 
              onClick={() => setShowCurrencyPicker(true)}
              className="w-full bg-[#F2F2F7] flex items-center justify-between py-3 px-4 rounded-2xl text-[15px] text-black outline-none active:bg-gray-200 transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="font-bold">{CURRENCIES.find(c => c.code === currency)?.name || currency}</span>
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
            />
          </div>

          <input 
            type="text" 
            placeholder="或自行輸入幣別代碼（如 THB）"
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
            取消
          </button>
          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "py-3.5 rounded-2xl font-bold text-[17px] text-white active:opacity-70 transition-all shadow-sm",
              name.trim() ? "bg-[#4285F4]" : "bg-[#A0CFFF] opacity-80 cursor-not-allowed"
            )}
          >
            建立
          </button>
        </div>
      </div>
    </div>
  );
}
