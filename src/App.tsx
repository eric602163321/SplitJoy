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
  const [hasLoadedPersonalFromCloud, setHasLoadedPersonalFromCloud] = useState(false);
  const [hasLoadedGroupsFromCloud, setHasLoadedGroupsFromCloud] = useState(false);
  
  const isFirstGroupsLoad = React.useRef(true);
  const isFirstPersonalLoad = React.useRef(true);
  const isLoggingOut = React.useRef(false);

  // Use refs to track current data for migration (avoid stale closure in useEffect)
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

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      
      // Reset flags when user changes
      setHasLoadedPersonalFromCloud(false);
      setHasLoadedGroupsFromCloud(false);
      isFirstGroupsLoad.current = true;
      isFirstPersonalLoad.current = true;
    });
    return () => unsubscribe();
  }, []);

  // Firebase Firestore Sync for Groups
  useEffect(() => {
    if (!user) return;

    console.log("Subscribing to groups for:", user.uid);
    const unsubscribe = syncUserGroups(user.uid, (syncedGroups) => {
      console.log(`[Cloud -> Local] 同步成功：從雲端下載了 ${syncedGroups.length} 個團體`);
      if (isFirstGroupsLoad.current) {
        isFirstGroupsLoad.current = false;
        
        // Strategy: 
        // 1. If cloud has data, it wins.
        // 2. If cloud is empty but local HAS data, upload local to cloud (migration).
        // 3. Otherwise, just accept cloud (which is empty).
        
        if (syncedGroups.length > 0) {
          setGroups(syncedGroups);
        } else if (groups.length > 0) {
          // Migration: Upload existing local groups to cloud
          console.log("Migrating local groups to cloud...");
          groups.forEach(async (group) => {
            try {
              await createGroup(group, user.uid);
            } catch (err) {
              console.error("Migration error for group:", group.id, err);
            }
          });
        }
      } else {
        // Subsequent updates: Cloud is the source of truth
        setGroups(syncedGroups);
      }
      setHasLoadedGroupsFromCloud(true);
    });

    return () => {
      console.log("Unsubscribing from groups");
      unsubscribe();
    };
  }, [user?.uid]); // Only re-subscribe if the user UID changes

  // Sync groups to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }, [groups]);

  // Firebase Firestore Sync for Personal Data
  useEffect(() => {
    if (!user) {
      setHasLoadedPersonalFromCloud(false);
      return;
    }

    console.log("Subscribing to personal data for:", user.uid);
    const unsubscribe = syncUserData(user.uid, (data) => {
      console.log(`[Cloud -> Local] 同步成功：從雲端下載了 ${data.expenses.length} 筆個人支出與 ${data.members.length} 位成員`);
      if (isFirstPersonalLoad.current) {
        isFirstPersonalLoad.current = false;
        
        const hasCloudData = data.expenses.length > 0 || data.members.length > 0;
        
        if (hasCloudData) {
          setPersonalExpenses(data.expenses);
          setMembers(data.members);
        } else {
          // Migration: If cloud is empty but local has data, sync it up
          const pExp = currentPersonalExpenses.current;
          const mems = currentMembers.current;
          if (pExp.length > 0 || mems.length > 0) {
            console.log("Migrating local personal data to cloud...", { pExpCount: pExp.length, memsCount: mems.length });
            updateUserData(user.uid, { 
              personalExpenses: pExp, 
              members: mems 
            }).then(() => console.log("Migration successful"))
              .catch(err => console.error("Migration error:", err));
          }
        }
      } else {
        setPersonalExpenses(data.expenses);
        setMembers(data.members);
      }
      setHasLoadedPersonalFromCloud(true);
    });

    return () => {
      console.log("Unsubscribing from personal data");
      unsubscribe();
    };
  }, [user?.uid]); // Only re-subscribe if the user UID changes

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

  const handleLogout = async () => {
    if (window.confirm('確定要登出嗎？登出後將清除此裝置上的資料，確保您的隱私。資料已儲存在雲端。')) {
      isLoggingOut.current = true;
      try {
        await signOut(auth);
        
        // Reset states
        setGroups([]);
        setPersonalExpenses([]);
        setMembers([]);
        setHasLoadedPersonalFromCloud(false);
        setHasLoadedGroupsFromCloud(false);
        
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.GROUPS);
        localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      } finally {
        // Extended guard period to ensure all effects settle
        setTimeout(() => {
          isLoggingOut.current = false;
        }, 1500);
      }
    }
  };

  // Sync personal state to local storage and Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(personalExpenses));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      if (personalExpenses.length === 0 && (isFirstPersonalLoad.current || !hasLoadedPersonalFromCloud)) {
        return;
      }
      console.log("[Local -> Cloud] 同步個人支出...", personalExpenses.length);
      updateUserData(user.uid, { personalExpenses }).catch(err => console.error("Sync error:", err));
    }
  }, [personalExpenses, user, hasLoadedPersonalFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      if (members.length === 0 && (isFirstPersonalLoad.current || !hasLoadedPersonalFromCloud)) {
        return;
      }
      console.log("[Local -> Cloud] 同步成員名單...", members.length);
      updateUserData(user.uid, { members }).catch(err => console.error("Sync error:", err));
    }
  }, [members, user, hasLoadedPersonalFromCloud]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const addMember = (m: Member) => setMembers(prev => [...prev, m]);
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const handleUpdateGroup = async (updatedGroup: Group) => {
    if (user) {
      try {
        await updateGroupDetails(updatedGroup.id, updatedGroup);
      } catch (err) {
        console.error("Failed to update group in Firestore:", err);
        // We don't rollback local state here for now to avoid jumpiness, 
        // but we should ideally notify the user.
      }
    } else {
      setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const handleAddGroup = async (newGroup: Group) => {
    console.log("Adding new group:", newGroup);
    setGroups(prev => [newGroup, ...prev]);
    
    if (user) {
      try {
        console.log("Creating group in Firestore for user:", user.uid);
        await createGroup(newGroup, user.uid);
      } catch (err) {
        console.error("Detailed error creating group:", err);
        setGroups(prev => prev.filter(g => g.id !== newGroup.id));
        alert("新增團體失敗，請檢查網路連線或稍後再試。");
      }
    }
    setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = async (id: string) => {
    // Optimistic update: Remove from local state immediately
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);

    if (user) {
      try {
        await deleteGroup(id);
      } catch (err) {
        console.error("Failed to delete group from Firestore:", err);
        // Error handling: maybe alert user?
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
