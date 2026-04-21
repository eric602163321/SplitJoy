/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Shield, ChevronRight, AlertCircle, Palette, Check, Type, X, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { cn } from '../lib/utils';

const THEME_OPTIONS = [
  { id: 'default', label: '系統默認', color: '#F2F2F7' },
  { id: 'soft-blue', label: '清爽藍', color: '#F5F9FF' },
  { id: 'soft-pink', label: '戀愛粉', color: '#FFF5F8' },
  { id: 'soft-green', label: '森林綠', color: '#F5FFF9' },
  { id: 'warm', label: '溫暖橘', color: '#FFF9F5' },
];

const LANGUAGE_OPTIONS = [
  { id: 'zh', label: '繁體中文', icon: '🇹🇼' },
  { id: 'en', label: 'English', icon: '🇺🇸' },
];

interface SettingsScreenProps {
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
  error?: string | null;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onLogin, onLogout, error }) => {
  const { t } = useTranslation();
  const { bgTexture, setBgTexture, fontSize, setFontSize, language, setLanguage } = useData();
  const [activeSheet, setActiveSheet] = useState<'theme' | 'font' | 'language' | 'logout' | null>(null);

  const currentTheme = THEME_OPTIONS.find(t => t.id === bgTexture) || THEME_OPTIONS[0];
  const currentLang = LANGUAGE_OPTIONS.find(l => l.id === language) || LANGUAGE_OPTIONS[0];

  const fontSizeLabels: Record<string, string> = {
    small: t('small'),
    medium: t('medium'),
    large: t('large')
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val === 0) setFontSize('small');
    else if (val === 1) setFontSize('medium');
    else setFontSize('large');
  };

  const getFontValue = () => {
    if (fontSize === 'small') return 0;
    if (fontSize === 'medium') return 1;
    return 2;
  };

  const handleLogoutWithConfirm = () => {
    onLogout();
    setActiveSheet(null);
  };

  const renderSheet = () => (
    <AnimatePresence>
      {activeSheet && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          
          <motion.div 
            drag={activeSheet !== 'logout' ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                setActiveSheet(null);
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "relative w-full max-w-lg overflow-hidden pb-10",
              activeSheet === 'logout' ? "bg-transparent px-4 flex flex-col gap-3" : "bg-[var(--color-ios-bg)] rounded-t-[24px] shadow-2xl"
            )}
          >
            {activeSheet !== 'logout' && (
              <>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full z-[210]" />
                <div className="p-4 pt-6 flex justify-between items-center border-b border-[var(--color-ios-separator)] bg-white/80 backdrop-blur-md">
                  <span className="text-[17px] font-bold ml-2">
                    {activeSheet === 'theme' ? t('bg_color') : activeSheet === 'font' ? t('font_size') : t('language')}
                  </span>
                  <button 
                    onClick={() => setActiveSheet(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-90 transition-all"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </>
            )}

            {activeSheet === 'logout' ? (
              <>
                <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-4 text-center border-b border-gray-200">
                    <p className="text-[13px] text-[#8E8E93] font-medium leading-tight">
                      {'確定要登出嗎？資料已儲存在雲端。'}
                    </p>
                  </div>
                  <button 
                    onClick={handleLogoutWithConfirm}
                    className="w-full p-4 text-[#FF3B30] text-[20px] font-medium active:bg-gray-100 transition-colors"
                  >
                    {t('logout')}
                  </button>
                </div>
                <button 
                  onClick={() => setActiveSheet(null)}
                  className="w-full bg-white p-4 text-[#007AFF] text-[20px] font-bold rounded-2xl shadow-lg active:bg-gray-100 transition-colors"
                >
                  {t('cancel')}
                </button>
              </>
            ) : (
              <div className="p-6">
                {activeSheet === 'theme' ? (
                  <div className="grid grid-cols-5 gap-3">
                    {THEME_OPTIONS.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setBgTexture(theme.id);
                          setTimeout(() => setActiveSheet(null), 200);
                        }}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-1 transition-all",
                        )}
                      >
                        <div 
                          className={cn(
                            "w-12 h-12 rounded-full shadow-sm flex items-center justify-center border-2 transition-all",
                            bgTexture === theme.id ? "border-[var(--color-ios-blue)] scale-110" : "border-white"
                          )}
                          style={{ backgroundColor: theme.color }}
                        >
                          {bgTexture === theme.id && <Check size={20} className="text-[var(--color-ios-blue)]" />}
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold transition-colors",
                          bgTexture === theme.id ? "text-[var(--color-ios-blue)]" : "text-gray-400"
                        )}>
                          {theme.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : activeSheet === 'font' ? (
                  <div className="flex flex-col gap-6 py-4">
                    <div className="flex justify-between items-end px-2">
                      <span className="text-[14px] font-bold text-gray-400">A</span>
                      <span className="text-[18px] font-bold text-gray-400 font-serif">A</span>
                      <span className="text-[24px] font-bold text-gray-400">A</span>
                    </div>
                    <div className="relative px-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="1"
                        value={getFontValue()}
                        onChange={handleFontChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-ios-blue)]"
                      />
                      <div className="absolute top-1/2 left-2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full pointer-events-none" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full pointer-events-none" />
                      <div className="absolute top-1/2 right-2 -translate-y-1/2 w-2 h-2 bg-gray-400 rounded-full pointer-events-none" />
                    </div>
                    <p className="text-center text-[13px] font-bold text-[var(--color-ios-grey)] mt-2 italic">
                      {t('current_size')}：{fontSizeLabels[fontSize]}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setLanguage(lang.id);
                          setTimeout(() => setActiveSheet(null), 200);
                        }}
                        className={cn(
                          "w-full p-4 flex items-center justify-between rounded-xl transition-all",
                          language === lang.id ? "bg-blue-50 text-[var(--color-ios-blue)]" : "bg-gray-50 text-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{lang.icon}</span>
                          <span className="font-bold">{lang.label}</span>
                        </div>
                        {language === lang.id && <Check size={20} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col gap-6 select-none relative">
      {renderSheet()}
      <div className="flex flex-col gap-1 px-2 pt-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('settings')}</h1>
        <p className="text-sm font-bold text-gray-400">{t('settings_desc')}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Account Section */}
        <section className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-black text-gray-400 uppercase tracking-widest">{t('account')}</h2>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mx-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </motion.div>
          )}

          <div className="ios-card divide-y divide-[var(--color-ios-separator)]">
            {user ? (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="" 
                      className="w-12 h-12 rounded-full border-2 border-[var(--color-ios-blue)] p-0.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img 
                      src="https://img.icons8.com/fluency/144/wallet.png" 
                      alt="Logo" 
                      className="w-12 h-12 rounded-full border-2 border-[var(--color-ios-blue)] p-0.5 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900">{user.displayName}</span>
                    <span className="text-xs text-gray-400 font-bold">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                  <Shield size={12} className="text-[var(--color-ios-blue)]" />
                  <span className="text-[10px] font-black text-[var(--color-ios-blue)] uppercase">{t('cloud_sync')}</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm overflow-hidden p-2.5">
                    <img 
                      src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" 
                      alt="Google" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900">{t('login')}</span>
                    <span className="text-xs text-gray-400 font-bold">{t('backup_desc')}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            )}

            {user && (
              <button 
                onClick={() => setActiveSheet('logout')}
                className="w-full p-4 flex items-center gap-3 hover:bg-red-50 active:bg-red-100 transition-colors text-red-500 font-bold"
              >
                <LogOut size={20} />
                <span>{t('logout')}</span>
              </button>
            )}
          </div>
        </section>

        {/* Appearance Section */}
        <section className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-black text-gray-400 uppercase tracking-widest">{t('personalization')}</h2>
          <div className="ios-card divide-y divide-[var(--color-ios-separator)]">
            <button 
              onClick={() => setActiveSheet('language')}
              className="w-full p-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <Languages size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-gray-900">{t('language')}</span>
                  <span className="text-[11px] text-gray-400 font-bold">{currentLang.label}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('theme')}
              className="w-full p-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[var(--color-ios-blue)]">
                  <Palette size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-gray-900">{t('bg_color')}</span>
                  <span className="text-[11px] text-gray-400 font-bold">{currentTheme.label}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>

            <button 
              onClick={() => setActiveSheet('font')}
              className="w-full p-4 flex items-center justify-between active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Type size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-gray-900">{t('font_size')}</span>
                  <span className="text-[11px] text-gray-400 font-bold">{fontSizeLabels[fontSize]}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </section>

        {/* General Section */}
        <section className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-black text-gray-400 uppercase tracking-widest">{t('about')}</h2>
          <div className="ios-card divide-y divide-[var(--color-ios-separator)]">
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-gray-700">{t('version')}</span>
              <span className="text-sm font-bold text-gray-400">1.0.0</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-gray-700">SplitJoy</span>
              <span className="text-xs font-bold text-gray-400">{t('made_with')}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
