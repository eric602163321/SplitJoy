/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useData } from './contexts/DataContext';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { Tab } from './types';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingJoinGroupId, setPendingJoinGroupId] = useState<string | null>(null);
  const [joinNotification, setJoinNotification] = useState<string | null>(null);
  const [joinIsError, setJoinIsError] = useState(false);
  const autoJoiningIdRef = React.useRef<string | null>(null);

  const {
    user,
    groups,
    personalExpenses,
    members,
    isAuthLoading,
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

  // Check query parameter on mount or auth change (wait for auth state to settle before showing login prompt)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join')?.trim();
    if (joinId) {
      setActiveTab('group');
      setPendingJoinGroupId(joinId);
      if (!isAuthLoading && !user) {
        setJoinIsError(false);
        setJoinNotification(t('join_link_detected'));
      }
    }
  }, [user, isAuthLoading, t]);

  // Try to auto-join when user is available and we have a pending join ID
  React.useEffect(() => {
    if (user && pendingJoinGroupId && autoJoiningIdRef.current !== pendingJoinGroupId) {
      autoJoiningIdRef.current = pendingJoinGroupId;
      setJoinIsError(false);
      setJoinNotification(t('auto_joining_group'));

      const cleanupUrl = () => {
        const url = new URL(window.location.href);
        url.searchParams.delete('join');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      };

      joinSharedGroup(pendingJoinGroupId)
        .then((joinedGroup) => {
          setSelectedGroupId(joinedGroup.id);
          setJoinIsError(false);
          setJoinNotification(t('join_group_success'));
          setPendingJoinGroupId(null);
          cleanupUrl();
          setTimeout(() => setJoinNotification(null), 3000);
        })
        .catch((err) => {
          console.error('Failed to auto join:', err);
          setJoinIsError(true);
          if (err?.message === 'group_not_found') {
            setJoinNotification(t('err_group_not_found'));
          } else if (err?.message === 'group_full') {
            setJoinNotification(t('err_group_full'));
          } else {
            setJoinNotification(t('join_group_failed'));
          }
          setPendingJoinGroupId(null);
          cleanupUrl();
          setTimeout(() => setJoinNotification(null), 4000);
        })
        .finally(() => {
          autoJoiningIdRef.current = null;
        });
    }
  }, [user, pendingJoinGroupId, joinSharedGroup, t]);

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
            <div className={
              joinIsError
                ? "bg-red-50 border border-red-100 p-4 rounded-2xl flex flex-col gap-3 shadow-sm"
                : "bg-[#EBF4FF] border border-blue-100 p-4 rounded-2xl flex flex-col gap-3 shadow-sm"
            }>
              <p className={
                joinIsError
                  ? "text-[13px] text-red-600 font-medium leading-normal"
                  : "text-[13px] text-[#4285F4] font-medium leading-normal"
              }>
                {joinNotification}
              </p>
              {!isAuthLoading && !user && (
                <button
                  onClick={handleLogin}
                  className="w-full h-10 bg-[#4285F4] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                >
                  <span>{t('login_google_now')}</span>
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
