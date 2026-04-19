/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { User as UserType } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Shield, ChevronRight, AlertCircle } from 'lucide-react';

interface SettingsScreenProps {
  user: UserType | null;
  onLogin: () => void;
  onLogout: () => void;
  error?: string | null;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onLogin, onLogout, error }) => {
  return (
    <div className="flex flex-col gap-6 select-none">
      <div className="flex flex-col gap-1 px-2 pt-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">設置</h1>
        <p className="text-sm font-bold text-gray-400">管理您的帳戶與應用偏好</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Account Section */}
        <section className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-black text-gray-400 uppercase tracking-widest">帳戶</h2>
          
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
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[var(--color-ios-blue)] border-2 border-blue-100">
                      <UserIcon size={24} />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900">{user.displayName}</span>
                    <span className="text-xs text-gray-400 font-bold">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                  <Shield size={12} className="text-[var(--color-ios-blue)]" />
                  <span className="text-[10px] font-black text-[var(--color-ios-blue)] uppercase">Cloud Sync</span>
                </div>
              </div>
            ) : (
              <button 
                onClick={onLogin}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                    <LogIn size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900">登入同步</span>
                    <span className="text-xs text-gray-400 font-bold">備份資料並跨裝置共享</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            )}

            {user && (
              <button 
                onClick={onLogout}
                className="w-full p-4 flex items-center gap-3 hover:bg-red-50 active:bg-red-100 transition-colors text-red-500 font-bold"
              >
                <LogOut size={20} />
                <span>登出帳戶</span>
              </button>
            )}
          </div>
        </section>

        {/* General Section */}
        <section className="flex flex-col gap-2">
          <h2 className="px-2 text-xs font-black text-gray-400 uppercase tracking-widest">關於</h2>
          <div className="ios-card divide-y divide-[var(--color-ios-separator)]">
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-gray-700">版本</span>
              <span className="text-sm font-bold text-gray-400">1.0.0</span>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-gray-700">SplitJoy</span>
              <span className="text-xs font-bold text-gray-400">Made with ❤️ for travel</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
