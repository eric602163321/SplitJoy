import React, { useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { Group } from '../types';
import { cn } from '../lib/utils';

interface CreateGroupFormProps {
  onAddGroup: (group: Group) => void;
  onCancel: () => void;
}

const CURRENCIES = [
  { code: 'TWD', name: 'NT$ 新台幣' },
  { code: 'USD', name: '$ 美金' },
  { code: 'JPY', name: '¥ 日圓' },
  { code: 'HKD', name: 'HK$ 港幣' },
  { code: 'EUR', name: '€ 歐元' },
];

export default function CreateGroupForm({ onAddGroup, onCancel }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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
              onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
              className="w-full bg-[#F2F2F7] flex items-center justify-between py-3 px-4 rounded-2xl text-[15px] text-black outline-none"
            >
              <span>{CURRENCIES.find(c => c.code === currency)?.name || currency}</span>
              <ChevronDown size={18} className={cn("text-[#C7C7CC] transition-transform", showCurrencyPicker && "rotate-180")} />
            </button>
            
            {showCurrencyPicker && (
              <div className="absolute top-full left-0 right-0 z-10 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.code);
                      setShowCurrencyPicker(false);
                      setCustomCurrency('');
                    }}
                    className="w-full px-4 py-3 text-left text-[15px] font-medium hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-none"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
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
