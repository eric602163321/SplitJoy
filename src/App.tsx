/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { syncUserGroups, createGroup, updateGroupDetails } from './lib/firebaseUtils';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { Tab, Group, Member, Expense } from './types';

// Storage keys
const STORAGE_KEYS = {
  PERSONAL_EXPENSES: 'splitit_personal_expenses',
  MEMBERS: 'splitit_members',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // Local storage for personal data
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERSONAL_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firebase Firestore Sync
  useEffect(() => {
    if (user) {
      const unsubscribe = syncUserGroups(user.uid, (syncedGroups) => {
        setGroups(syncedGroups);
      });
      return () => unsubscribe();
    } else {
      setGroups([]);
    }
  }, [user]);

  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        setAuthError(`目前的網域未被授權。請前往 Firebase 控制台將「${hostname}」加入 Authentication 的「授權網域」清單中。`);
      } else if (error.code === 'auth/configuration-not-found') {
        setAuthError('Firebase 驗證未啟用。請前往 Firebase 控制台啟動 Authentication 並啟用 Google 登入方式。');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('Google 登入尚未在 Firebase 控制台啟用。');
      } else {
        setAuthError(error.message || '登入失敗，請稍後再試。');
      }
    }
  };

  const handleLogout = () => signOut(auth);

  // Sync personal state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(personalExpenses));
  }, [personalExpenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const addMember = (m: Member) => setMembers(prev => [...prev, m]);
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const handleUpdateGroup = async (updatedGroup: Group) => {
    if (user) {
      await updateGroupDetails(updatedGroup.id, updatedGroup);
    } else {
      setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const handleAddGroup = async (newGroup: Group) => {
    if (user) {
      await createGroup(newGroup, user.uid);
    } else {
      setGroups(prev => [...prev, newGroup]);
    }
    setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = (id: string) => {
    // For now, deletion is handled by setting groups state if not logged in
    // Real deletion utility needs to be added to firebaseUtils
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ios-bg)] flex flex-col items-center">
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
                onAddGroup={handleAddGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateGroup={handleUpdateGroup}
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
