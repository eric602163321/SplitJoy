/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { syncUserGroups, createGroup, updateGroupDetails, syncUserData, updateUserData, deleteGroup } from './lib/firebaseUtils';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { Tab, Group, Member, Expense } from './types';

// Storage keys
const STORAGE_KEYS = {
  PERSONAL_EXPENSES: 'splitit_personal_expenses',
  MEMBERS: 'splitit_members',
  GROUPS: 'splitit_groups',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return saved ? JSON.parse(saved) : [];
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
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
  const [hasLoadedPersonalFromCloud, setHasLoadedPersonalFromCloud] = useState(false);
  const [hasLoadedGroupsFromCloud, setHasLoadedGroupsFromCloud] = useState(false);
  
  const isFirstGroupsLoad = React.useRef(true);
  const isFirstPersonalLoad = React.useRef(true);
  const isLoggingOut = React.useRef(false);

  // Use refs to track current state for effects
  const currentPersonalExpenses = React.useRef(personalExpenses);
  const currentMembers = React.useRef(members);
  const currentGroups = React.useRef(groups);
  
  useEffect(() => {
    currentPersonalExpenses.current = personalExpenses;
  }, [personalExpenses]);

  useEffect(() => {
    currentMembers.current = members;
  }, [members]);

  useEffect(() => {
    currentGroups.current = groups;
  }, [groups]);

  // Migration logic: Force upload from LocalStorage to Cloud upon login
  const migrateLocalDataToCloud = async (userId: string) => {
    console.log("[Migration] Starting data migration...");
    
    // 1. Group Migration
    const localGroupsRaw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (localGroupsRaw) {
      try {
        const localGroups: Group[] = JSON.parse(localGroupsRaw);
        if (localGroups.length > 0) {
          console.log(`[Migration] Found ${localGroups.length} groups to migrate.`);
          await Promise.all(localGroups.map(g => createGroup(g, userId)));
        }
      } catch (e) {
        console.error("Migration error (groups):", e);
      }
    }

    // 2. Personal Data Migration
    const localExpRaw = localStorage.getItem(STORAGE_KEYS.PERSONAL_EXPENSES);
    const localMemsRaw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const updates: any = {};
    
    try {
      if (localExpRaw) {
        const pExp = JSON.parse(localExpRaw);
        if (pExp.length > 0) updates.personalExpenses = pExp;
      }
      if (localMemsRaw) {
        const mems = JSON.parse(localMemsRaw);
        if (mems.length > 0) updates.members = mems;
      }

      if (Object.keys(updates).length > 0) {
        console.log("[Migration] Migrating personal data...", Object.keys(updates));
        await updateUserData(userId, updates);
      }
    } catch (e) {
      console.error("Migration error (personal):", e);
    }
    
    console.log("[Migration] Migration completed successfully.");
  };

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Logic: If user just logged in and we weren't already logged in
      if (currentUser && !user) {
        console.log("Member logged in. Identity:", currentUser.email);
        await migrateLocalDataToCloud(currentUser.uid);
      }
      
      setUser(currentUser);
      setIsAuthLoading(false);
      
      if (!currentUser) {
        setHasLoadedPersonalFromCloud(false);
        setHasLoadedGroupsFromCloud(false);
        isFirstGroupsLoad.current = true;
        isFirstPersonalLoad.current = true;
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Firebase Firestore Sync for Groups
  useEffect(() => {
    if (!user) return;

    const unsubscribe = syncUserGroups(user.uid, (syncedGroups) => {
      console.log(`[Cloud -> Local] 同步成功：下載 ${syncedGroups.length} 個團體`);
      
      // If logging out, ignore cloud snapshot
      if (isLoggingOut.current) return;

      setGroups(syncedGroups);
      setHasLoadedGroupsFromCloud(true);
      isFirstGroupsLoad.current = false;
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Firebase Firestore Sync for Personal Data
  useEffect(() => {
    if (!user) return;

    const unsubscribe = syncUserData(user.uid, (data) => {
      console.log(`[Cloud -> Local] 同步成功：下載 ${data.expenses.length} 筆支出`);
      
      // If logging out, ignore cloud snapshot
      if (isLoggingOut.current) return;

      setPersonalExpenses(data.expenses);
      setMembers(data.members);
      setHasLoadedPersonalFromCloud(true);
      isFirstPersonalLoad.current = false;
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      setAuthError(error.message || '登入失敗，請稍後再試。');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('確定要登出嗎？登出後將清除此裝置上的資料。資料已儲存在雲端。')) {
      isLoggingOut.current = true;
      try {
        await signOut(auth);
        
        setGroups([]);
        setPersonalExpenses([]);
        setMembers([]);
        setHasLoadedPersonalFromCloud(false);
        setHasLoadedGroupsFromCloud(false);
        
        localStorage.removeItem(STORAGE_KEYS.GROUPS);
        localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      } finally {
        setTimeout(() => {
          isLoggingOut.current = false;
        }, 2000);
      }
    }
  };

  // Sync personal state to local storage and Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(personalExpenses));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current && !isFirstPersonalLoad.current) {
      console.log("[Local -> Cloud] 同步個人支出...", personalExpenses.length);
      updateUserData(user.uid, { personalExpenses }).catch(err => console.error("Sync error:", err));
    }
  }, [personalExpenses, user, hasLoadedPersonalFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current && !isFirstPersonalLoad.current) {
      console.log("[Local -> Cloud] 同步成員名單...", members.length);
      updateUserData(user.uid, { members }).catch(err => console.error("Sync error:", err));
    }
  }, [members, user, hasLoadedPersonalFromCloud]);

  // Other component logic...
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const addMember = (m: Member) => setMembers(prev => [...prev, m]);
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const handleUpdateGroup = async (updatedGroup: Group) => {
    if (user) {
      try {
        await updateGroupDetails(updatedGroup.id, updatedGroup);
      } catch (err) {
        console.error("Failed to update group in Firestore:", err);
      }
    } else {
      setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const handleAddGroup = async (newGroup: Group) => {
    setGroups(prev => [newGroup, ...prev]);
    if (user) {
      try {
        await createGroup(newGroup, user.uid);
      } catch (err) {
        console.error("Error creating group:", err);
        setGroups(prev => prev.filter(g => g.id !== newGroup.id));
        alert("新增團體失敗。");
      }
    }
    setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = async (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
    if (user) {
      try {
        await deleteGroup(id);
      } catch (err) {
        console.error("Failed to delete group:", err);
      }
    }
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
