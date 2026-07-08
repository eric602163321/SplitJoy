/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { syncUserGroups, createGroup, updateGroupDetails, syncUserData, updateUserData, deleteGroup, joinGroup } from '../lib/firebaseUtils';
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
  language: string;
  defaultCurrency: string;
  
  // Actions
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  setBgTexture: (texture: string) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setLanguage: (lang: string) => void;
  setDefaultCurrency: (cur: string) => void;
  addPersonalExpense: (expense: Expense) => void;
  setPersonalExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  addMember: (member: Member) => void;
  removeMember: (id: string) => void;
  addGroup: (group: Group) => Promise<void>;
  updateGroup: (group: Group) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  joinSharedGroup: (groupId: string) => Promise<Group>;
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
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('i18nextLng') || 'zh';
  });
  const [defaultCurrency, setDefaultCurrencyState] = useState(() => {
    return localStorage.getItem('splitit_default_currency') || 'TWD';
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

  // Tracking the last state we received from or successfully pushed to the cloud
  const lastReceivedPersonalExpenses = useRef<string>('');
  const lastReceivedMembers = useRef<string>('');

  useEffect(() => { currentPersonalExpenses.current = personalExpenses; }, [personalExpenses]);
  useEffect(() => { currentMembers.current = members; }, [members]);
  useEffect(() => { currentGroups.current = groups; }, [groups]);

  // Auth Observer & Redirect Result
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("[Auth] Signed in via redirect:", result.user);
          setUser(result.user);
        }
      } catch (error: any) {
        console.error("[Auth] Redirect result error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError(
            `轉址登入失敗：未授權的網域 (unauthorized-domain)。\n\n` +
            `您目前正透過自訂網域 (${window.location.hostname}) 進行測試，但專案仍使用預設的臨時 Firebase 專案 (${firebaseConfig.projectId})。\n\n` +
            `【解決方案】：請在您的程式碼 (firebase-applet-config.json) 中替換為您自己的 Firebase 專案配置，並在您自己的 Firebase 控制台「授權網域」中新增您的網域 (${window.location.hostname})。`
          );
        } else {
          setAuthError(error.message || 'Redirect sign-in failed');
        }
      } finally {
        unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          setIsAuthLoading(false);
          setHasLoadedPersonalFromCloud(false);
          setHasLoadedGroupsFromCloud(false);
          isFirstGroupsLoad.current = true;
          isFirstPersonalLoad.current = true;
          lastReceivedPersonalExpenses.current = '';
          lastReceivedMembers.current = '';
        });
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
      
      // Update our sync tracker immediately with what we got from cloud
      const cloudExpensesStr = JSON.stringify(data.expenses);
      const cloudMembersStr = JSON.stringify(data.members);
      lastReceivedPersonalExpenses.current = cloudExpensesStr;
      lastReceivedMembers.current = cloudMembersStr;

      if (isFirstPersonalLoad.current) {
        isFirstPersonalLoad.current = false;
        if (data.expenses.length > 0 || data.members.length > 0) {
          setPersonalExpenses(data.expenses);
          setMembers(data.members);
        } else {
          const pExp = currentPersonalExpenses.current;
          const mems = currentMembers.current;
          const localExpensesStr = JSON.stringify(pExp);
          const localMembersStr = JSON.stringify(mems);
          if (pExp.length > 0 || mems.length > 0) {
            console.log("Migrating local personal data to cloud...");
            lastReceivedPersonalExpenses.current = localExpensesStr;
            lastReceivedMembers.current = localMembersStr;
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

  // Local Storage & Debounced Cloud Sync (Upstream)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    const currentExpStr = JSON.stringify(personalExpenses);
    const currentMemsStr = JSON.stringify(members);

    // Immediate persistence to LocalStorage
    localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, currentExpStr);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, currentMemsStr);

    // Debounced sync to Firebase (Wait 2.5s of inactivity)
    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      // Check if local string matches cloud tracker. If so, SKIP upload!
      if (currentExpStr === lastReceivedPersonalExpenses.current && currentMemsStr === lastReceivedMembers.current) {
        return;
      }

      // Avoid syncing empty local state immediately after auth if first load isn't done
      if (personalExpenses.length > 0 || members.length > 0 || !isFirstPersonalLoad.current) {
        const timer = setTimeout(() => {
          console.log(`[Cloud Sync] Debounced update for ${user.uid}`);
          lastReceivedPersonalExpenses.current = currentExpStr;
          lastReceivedMembers.current = currentMemsStr;
          updateUserData(user.uid, { personalExpenses, members }).catch(console.error);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [personalExpenses, members, user, hasLoadedPersonalFromCloud]);

  const updateTheme = React.useCallback((textureValue: string, sizeValue: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    
    // Background Texture
    switch (textureValue) {
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
    switch (sizeValue) {
      case 'medium':
        root.style.setProperty('--app-font-scale', '1.1');
        break;
      case 'large':
        root.style.setProperty('--app-font-scale', '1.25');
        break;
      default: // small
        root.style.setProperty('--app-font-scale', '1.0');
    }
  }, []);

  const setBgTexture = React.useCallback((texture: string) => {
    setBgTextureState(texture);
    localStorage.setItem('splitit_bg_texture', texture);
    updateTheme(texture, fontSize);
  }, [updateTheme, fontSize]);

  const setFontSize = React.useCallback((size: 'small' | 'medium' | 'large') => {
    setFontSizeState(size);
    localStorage.setItem('splitit_font_size', size);
    updateTheme(bgTexture, size);
  }, [updateTheme, bgTexture]);

  const setLanguage = React.useCallback((lang: string) => {
    import('../i18n').then(i18n => {
      i18n.default.changeLanguage(lang);
      setLanguageState(lang);
    });
  }, []);

  const setDefaultCurrency = React.useCallback((cur: string) => {
    setDefaultCurrencyState(cur);
    localStorage.setItem('splitit_default_currency', cur);
  }, []);

  useEffect(() => {
    updateTheme(bgTexture, fontSize);
  }, [bgTexture, fontSize, updateTheme]);

  const handleLogin = React.useCallback(async () => {
    setAuthError(null);
    try {
      // Always try popup login first, as it is highly reliable and avoids cross-site cookie restrictions
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      console.error("Popup login failed:", error);
      
      if (error.code === 'auth/popup-blocked') {
        try {
          console.log("Popup blocked. Trying signInWithRedirect as fallback...");
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } catch (redirectError: any) {
          console.error("Redirect fallback failed:", redirectError);
          if (redirectError.code === 'auth/unauthorized-domain') {
            setAuthError(
              `登入失敗：未授權的網域 (unauthorized-domain)。\n\n` +
              `您目前正透過自訂網域 (${window.location.hostname}) 進行測試，但專案仍使用預設的臨時 Firebase 專案 (${firebaseConfig.projectId})。\n\n` +
              `【解決方案】：請在您的程式碼 (firebase-applet-config.json) 中替換為您自己的 Firebase 專案配置，並在您自己的 Firebase 控制台「授權網域」中新增您的網域 (${window.location.hostname})。`
            );
          } else {
            setAuthError(redirectError.message || 'Login failed');
          }
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError(
          `登入失敗：未授權的網域 (unauthorized-domain)。\n\n` +
          `您目前正透過自訂網域 (${window.location.hostname}) 進行測試，但專案仍使用預設的臨時 Firebase 專案 (${firebaseConfig.projectId})。\n\n` +
          `【解決方案】：請在您的程式碼 (firebase-applet-config.json) 中替換為您自己的 Firebase 專案配置，並在您自己的 Firebase 控制台「授權網域」中新增您的網域 (${window.location.hostname})。`
        );
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setAuthError('提示：您已取消 Google 登入。如果需要使用雲端同步功能，請再次點擊登入。');
      } else {
        setAuthError(error.message || 'Login failed');
      }
    }
  }, []);

  const handleLogout = React.useCallback(async () => {
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
  }, []);

  const addPersonalExpense = React.useCallback((expense: Expense) => {
    setPersonalExpenses(prev => [expense, ...prev]);
  }, []);

  const addMember = React.useCallback((m: Member) => setMembers(prev => [...prev, m]), []);
  const removeMember = React.useCallback((id: string) => setMembers(prev => prev.filter(m => m.id !== id)), []);

  const addGroup = React.useCallback(async (newGroup: Group) => {
    setGroups(prev => [newGroup, ...prev]);
    if (user) {
      try { await createGroup(newGroup, user.uid); }
      catch (e) { 
        setGroups(prev => prev.filter(g => g.id !== newGroup.id)); 
        throw e;
      }
    }
  }, [user]);

  const updateGroup = React.useCallback(async (updatedGroup: Group) => {
    if (user) {
      await updateGroupDetails(updatedGroup.id, updatedGroup);
    } else {
      setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    }
  }, [user]);

  const removeGroup = React.useCallback(async (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    if (user) await deleteGroup(id);
  }, [user]);

  const joinSharedGroup = React.useCallback(async (groupId: string) => {
    if (!user) throw new Error('not_logged_in');
    const updatedGroup = await joinGroup(groupId, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    if (updatedGroup) {
      setGroups(prev => {
        if (prev.some(g => g.id === updatedGroup.id)) {
          return prev.map(g => g.id === updatedGroup.id ? updatedGroup : g);
        }
        return [updatedGroup, ...prev];
      });
      return updatedGroup;
    }
    throw new Error('failed_to_join');
  }, [user]);

  const contextValue = React.useMemo(() => ({
    user, 
    groups, 
    personalExpenses, 
    members, 
    isAuthLoading,
    isInitialSyncComplete: hasLoadedPersonalFromCloud && hasLoadedGroupsFromCloud,
    authError, 
    handleLogin, 
    handleLogout, 
    addPersonalExpense, 
    setPersonalExpenses,
    addMember, 
    removeMember, 
    addGroup, 
    updateGroup, 
    removeGroup,
    joinSharedGroup,
    bgTexture, 
    setBgTexture, 
    fontSize, 
    setFontSize, 
    language, 
    setLanguage,
    defaultCurrency,
    setDefaultCurrency
  }), [
    user, groups, personalExpenses, members, isAuthLoading, 
    hasLoadedPersonalFromCloud, hasLoadedGroupsFromCloud, authError,
    handleLogin, handleLogout, addPersonalExpense, addMember, 
    removeMember, addGroup, updateGroup, removeGroup, joinSharedGroup,
    bgTexture, setBgTexture, fontSize, setFontSize, language, setLanguage,
    defaultCurrency, setDefaultCurrency
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
