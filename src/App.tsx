/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from './contexts/DataContext';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { Tab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingJoinGroupId, setPendingJoinGroupId] = useState<string | null>(null);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  
  const {
    user,
    groups,
    personalExpenses,
    members,
    authError,
    handleLogin,
    handleLogout,
    setPersonalExpenses,
    addMember,
    removeMember,
    addGroup,
    updateGroup,
    removeGroup,
    joinSharedGroup
  } = useData();

  // Check query parameter on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      setActiveTab('group');
      setPendingJoinGroupId(joinId);
      if (!user) {
        setJoinNotification('偵測到團體邀請連結！請先在下方登入 Google 帳號，即可自動加入團體並共同編輯。');
      }
    }
  }, [user]);

  // Try to auto-join when user is available and we have a pending join ID
  React.useEffect(() => {
    if (user && pendingJoinGroupId) {
      setJoinNotification('正在為您自動加入團體...');
      joinSharedGroup(pendingJoinGroupId)
        .then((joinedGroup) => {
          setSelectedGroupId(joinedGroup.id);
          setJoinNotification('成功加入共享團體！');
          setPendingJoinGroupId(null);
          // Remove query param from url
          const url = new URL(window.location.href);
          url.searchParams.delete('join');
          window.history.replaceState({}, '', url.pathname + url.search);
          setTimeout(() => setJoinNotification(null), 3000);
        })
        .catch((err) => {
          console.error('Failed to auto join:', err);
          setJoinNotification('自動加入團體失敗，可能此代碼無效或您已是成員。');
          setPendingJoinGroupId(null);
          // Remove query param from url
          const url = new URL(window.location.href);
          url.searchParams.delete('join');
          window.history.replaceState({}, '', url.pathname + url.search);
          setTimeout(() => setJoinNotification(null), 4000);
        });
    }
  }, [user, pendingJoinGroupId, joinSharedGroup]);

  return (
    <div className="min-h-screen bg-[var(--color-ios-bg)] flex flex-col items-center">
      <AnimatePresence>
        {joinNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="w-full max-w-xl mx-auto mt-4 px-4 z-50"
          >
            <div className="bg-[#EBF4FF] border border-blue-100 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
              <p className="text-[13px] text-[#4285F4] font-medium leading-normal">
                {joinNotification}
              </p>
              {!user && (
                <button 
                  onClick={handleLogin}
                  className="w-full h-10 bg-[#4285F4] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                >
                  <span>立即登入 Google 帳號</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 pb-[100px] pt-4 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full"
          >
            {activeTab === 'personal' && (
              <PersonalScreen 
                expenses={personalExpenses} 
                setExpenses={setPersonalExpenses} 
              />
            )}
            {activeTab === 'group' && (
              <GroupScreen 
                groups={groups}
                selectedGroupId={selectedGroupId}
                setSelectedGroupId={setSelectedGroupId}
                onAddGroup={addGroup}
                onDeleteGroup={removeGroup}
                onUpdateGroup={updateGroup}
                members={members}
                onAddMember={addMember}
                onRemoveMember={removeMember}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsScreen 
                user={user}
                onLogin={handleLogin}
                onLogout={handleLogout}
                error={authError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 ios-blur border-t border-[var(--color-ios-separator)]">
        <div className="max-w-xl mx-auto">
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
}
