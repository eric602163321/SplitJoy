import React from 'react';
import { User, Users, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="h-[64px] flex px-2 bg-white/80 backdrop-blur-md">
      <button
        onClick={() => setActiveTab('personal')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${activeTab === 'personal' ? 'text-[var(--color-ios-blue)] scale-110' : 'text-[var(--color-ios-grey)]'}`}
      >
        <User size={22} strokeWidth={activeTab === 'personal' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-tight">{t('personal')}</span>
      </button>

      <button
        onClick={() => setActiveTab('group')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${activeTab === 'group' ? 'text-[var(--color-ios-blue)] scale-110' : 'text-[var(--color-ios-grey)]'}`}
      >
        <Users size={22} strokeWidth={activeTab === 'group' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-tight">{t('groups')}</span>
      </button>

      <button
        onClick={() => setActiveTab('settings')}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${activeTab === 'settings' ? 'text-[var(--color-ios-blue)] scale-110' : 'text-[var(--color-ios-grey)]'}`}
      >
        <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-tight">{t('settings')}</span>
      </button>
    </nav>
  );
}
