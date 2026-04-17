import React from 'react';
import { User, Users, PieChart as ChartIcon } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="h-[64px] flex px-2 bg-white/80 backdrop-blur-md">
      <button
        onClick={() => setActiveTab('personal')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${activeTab === 'personal' ? 'text-[var(--color-ios-blue)] scale-110' : 'text-[var(--color-ios-grey)]'}`}
      >
        <User size={22} strokeWidth={activeTab === 'personal' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-tight">個人</span>
      </button>

      <button
        onClick={() => setActiveTab('group')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${activeTab === 'group' ? 'text-[var(--color-ios-blue)] scale-110' : 'text-[var(--color-ios-grey)]'}`}
      >
        <Users size={22} strokeWidth={activeTab === 'group' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-tight">分帳</span>
      </button>
    </nav>
  );
}
