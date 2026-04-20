/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { syncUserGroups, createGroup, updateGroupDetails, syncUserData, updateUserData, deleteGroup } from '../lib/firebaseUtils';
import { Group, Member, Expense } from '../types';

interface DataContextType {
  user: User | null;
  groups: Group[];
  personalExpenses: Expense[];
  members: Member[];
  isAuthLoading: boolean;
  isInitialSyncComplete: boolean;
  authError: string | null;
  bgTexture: string;
  fontSize: 'small' | 'medium' | 'large';
  
  // Actions
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  setBgTexture: (texture: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  addPersonalExpense: (expense: Expense) => void;
  setPersonalExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  addMember: (member: Member) => void;
  removeMember: (id: string) => void;
  addGroup: (group: Group) => Promise<void>;
  updateGroup: (group: Group) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PERSONAL_EXPENSES: 'splitit_personal_expenses',
  MEMBERS: 'splitit_members',
  GROUPS: 'splitit_groups',
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return saved ? JSON.parse(saved) : [];
  });
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERSONAL_EXPENSES);
    return saved ? JSON.parse(saved) : [];
  });
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [bgTexture, setBgTextureState] = useState(() => {
    return localStorage.getItem('splitit_bg_texture') || 'default';
  });
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('splitit_font_size') as 'small' | 'medium' | 'large') || 'small';
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasLoadedPersonalFromCloud, setHasLoadedPersonalFromCloud] = useState(false);
  const [hasLoadedGroupsFromCloud, setHasLoadedGroupsFromCloud] = useState(false);

  const isFirstGroupsLoad = useRef(true);
  const isFirstPersonalLoad = useRef(true);
  const isLoggingOut = useRef(false);

  const currentPersonalExpenses = useRef(personalExpenses);
  const currentMembers = useRef(members);
  const currentGroups = useRef(groups);

  useEffect(() => { currentPersonalExpenses.current = personalExpenses; }, [personalExpenses]);
  useEffect(() => { currentMembers.current = members; }, [members]);
  useEffect(() => { currentGroups.current = groups; }, [groups]);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      setHasLoadedPersonalFromCloud(false);
      setHasLoadedGroupsFromCloud(false);
      isFirstGroupsLoad.current = true;
      isFirstPersonalLoad.current = true;
    });
    return () => unsubscribe();
  }, []);

  // Sync Groups
  useEffect(() => {
    if (!user) return;
    const unsubscribe = syncUserGroups(user.uid, (syncedGroups) => {
      console.log(`[Cloud -> Local] Groups synced: ${syncedGroups.length}`);
      if (isFirstGroupsLoad.current) {
        isFirstGroupsLoad.current = false;
        if (syncedGroups.length > 0) {
          setGroups(syncedGroups);
        } else if (currentGroups.current.length > 0) {
          console.log("Migrating local groups to cloud...");
          currentGroups.current.forEach(async (g) => {
            try { await createGroup(g, user.uid); } catch (e) { console.error(e); }
          });
        }
      } else {
        setGroups(syncedGroups);
      }
      setHasLoadedGroupsFromCloud(true);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Sync Personal Data
  useEffect(() => {
    if (!user) return;
    const unsubscribe = syncUserData(user.uid, (data) => {
      console.log(`[Cloud -> Local] Personal synced`);
      if (isFirstPersonalLoad.current) {
        isFirstPersonalLoad.current = false;
        if (data.expenses.length > 0 || data.members.length > 0) {
          setPersonalExpenses(data.expenses);
          setMembers(data.members);
        } else {
          const pExp = currentPersonalExpenses.current;
          const mems = currentMembers.current;
          if (pExp.length > 0 || mems.length > 0) {
            console.log("Migrating local personal data to cloud...");
            updateUserData(user.uid, { personalExpenses: pExp, members: mems });
          }
        }
      } else {
        setPersonalExpenses(data.expenses);
        setMembers(data.members);
      }
      setHasLoadedPersonalFromCloud(true);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Local Storage & Cloud Sync (Upstream)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, JSON.stringify(personalExpenses));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      if (personalExpenses.length > 0 || !isFirstPersonalLoad.current) {
        updateUserData(user.uid, { personalExpenses }).catch(console.error);
      }
    }
  }, [personalExpenses, user, hasLoadedPersonalFromCloud]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      if (members.length > 0 || !isFirstPersonalLoad.current) {
        updateUserData(user.uid, { members }).catch(console.error);
      }
    }
  }, [members, user, hasLoadedPersonalFromCloud]);

  const setBgTexture = (texture: string) => {
    setBgTextureState(texture);
    localStorage.setItem('splitit_bg_texture', texture);
    updateTheme(texture, fontSize);
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('splitit_font_size', size);
    updateTheme(bgTexture, size);
  };

  const updateTheme = (texture: string, size: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    
    // Background Texture
    switch (texture) {
      case 'soft-blue':
        root.style.setProperty('--color-ios-bg', '#F5F9FF');
        break;
      case 'soft-pink':
        root.style.setProperty('--color-ios-bg', '#FFF5F8');
        break;
      case 'soft-green':
        root.style.setProperty('--color-ios-bg', '#F5FFF9');
        break;
      case 'warm':
        root.style.setProperty('--color-ios-bg', '#FFF9F5');
        break;
      case 'dark-glass':
        root.style.setProperty('--color-ios-bg', '#121212');
        root.style.setProperty('--text-color', '#FFFFFF');
        break;
      default:
        root.style.setProperty('--color-ios-bg', '#F2F2F7');
    }

    // Font Size
    switch (size) {
      case 'medium':
        root.style.setProperty('--app-font-scale', '1.1');
        break;
      case 'large':
        root.style.setProperty('--app-font-scale', '1.25');
        break;
      default: // small
        root.style.setProperty('--app-font-scale', '1.0');
    }
  };

  useEffect(() => {
    updateTheme(bgTexture, fontSize);
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      setAuthError(error.message || 'Login failed');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('確定要登出嗎？資料已儲存在雲端。')) {
      isLoggingOut.current = true;
      try {
        await signOut(auth);
        setGroups([]);
        setPersonalExpenses([]);
        setMembers([]);
        localStorage.removeItem(STORAGE_KEYS.GROUPS);
        localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      } finally {
        setTimeout(() => { isLoggingOut.current = false; }, 1500);
      }
    }
  };

  const addPersonalExpense = (expense: Expense) => {
    setPersonalExpenses(prev => [expense, ...prev]);
  };

  const addMember = (m: Member) => setMembers(prev => [...prev, m]);
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const addGroup = async (newGroup: Group) => {
    setGroups(prev => [newGroup, ...prev]);
    if (user) {
      try { await createGroup(newGroup, user.uid); }
      catch (e) { 
        setGroups(prev => prev.filter(g => g.id !== newGroup.id)); 
        throw e;
      }
    }
  };

  const updateGroup = async (updatedGroup: Group) => {
    if (user) {
      await updateGroupDetails(updatedGroup.id, updatedGroup);
    } else {
      setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  };

  const removeGroup = async (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    if (user) await deleteGroup(id);
  };

  return (
    <DataContext.Provider value={{
      user, groups, personalExpenses, members, isAuthLoading,
      isInitialSyncComplete: hasLoadedPersonalFromCloud && hasLoadedGroupsFromCloud,
      authError, handleLogin, handleLogout, addPersonalExpense, setPersonalExpenses,
      addMember, removeMember, addGroup, updateGroup, removeGroup,
      bgTexture, setBgTexture, fontSize, setFontSize
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
