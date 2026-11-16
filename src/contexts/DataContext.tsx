/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  syncUserGroups,
  createGroup,
  updateGroupDetails,
  syncUserData,
  updateUserData,
  deleteGroup,
  joinGroup,
  upsertGroupExpense,
  deleteGroupExpense,
  ensureGroupSyncedOnCloud
} from '../lib/firebaseUtils';
import { safeParseJSON, isChineseLocale } from '../lib/utils';
import { Group, Member, Expense } from '../types';
import i18n from '../i18n';

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
  saveGroupExpense: (groupId: string, expense: Expense) => Promise<void>;
  removeGroupExpense: (groupId: string, expenseId: string) => Promise<void>;
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
    const parsed = safeParseJSON<Group[]>(localStorage.getItem(STORAGE_KEYS.GROUPS), []);
    return Array.isArray(parsed) ? parsed : [];
  });
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>(() => {
    const parsed = safeParseJSON<Expense[]>(localStorage.getItem(STORAGE_KEYS.PERSONAL_EXPENSES), []);
    return Array.isArray(parsed) ? parsed : [];
  });
  const [members, setMembers] = useState<Member[]>(() => {
    const parsed = safeParseJSON<Member[]>(localStorage.getItem(STORAGE_KEYS.MEMBERS), []);
    return Array.isArray(parsed) ? parsed : [];
  });
  const [bgTexture, setBgTextureState] = useState(() => {
    return localStorage.getItem('splitit_bg_texture') || 'default';
  });
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    const saved = localStorage.getItem('splitit_font_size');
    return saved === 'small' || saved === 'medium' || saved === 'large' ? saved : 'small';
  });
  const [language, setLanguageState] = useState(() => {
    const detected = i18n.language || localStorage.getItem('i18nextLng') || 'zh';
    return isChineseLocale(detected) ? 'zh' : 'en';
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
  const pendingPersonalSyncRef = useRef<(() => void) | null>(null);
  const recentlyJoinedGroupsRef = useRef<Map<string, Group>>(new Map());

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
          setUser(result.user);
        }
      } catch (error: any) {
        console.error('[Auth] Redirect result error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          setAuthError(
            `登入失敗：未授權的網域 (auth/unauthorized-domain)。\n\n` +
            `🎉 您已成功將 App 設定為您的 Firebase 專案「${firebaseConfig.projectId}」！\n` +
            `為了安全起見，您需要允許目前的測試網域進行 Google 登入。\n\n` +
            `【解決步驟】：\n` +
            `1. 進入您的 Firebase 控制台：\n` +
            `   👉 https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers\n` +
            `2. 點擊上方的「設定 (Settings)」頁籤。\n` +
            `3. 點擊左側的「已授權網域 (Authorized domains)」。\n` +
            `4. 點擊「新增網域 (Add domain)」，並貼上此網域：\n` +
            `   🔹 ${window.location.hostname}\n` +
            `5. 儲存後等候約 10~30 秒，重新整理此網頁再試一次即可成功登入！`
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
          pendingPersonalSyncRef.current = null;
          recentlyJoinedGroupsRef.current.clear();
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
    const uid = user.uid;
    const unsubscribe = syncUserGroups(
      uid,
      (syncedGroups) => {
        // Reconcile any newly joined group that hasn't propagated to the query snapshot yet
        const syncedIds = new Set(syncedGroups.map(g => g.id));
        recentlyJoinedGroupsRef.current.forEach((_, joinedId) => {
          if (syncedIds.has(joinedId)) {
            recentlyJoinedGroupsRef.current.delete(joinedId);
          }
        });
        const pendingJoined = Array.from(recentlyJoinedGroupsRef.current.values());
        const mergedGroups = pendingJoined.length > 0
          ? [...pendingJoined, ...syncedGroups]
          : syncedGroups;

        if (isFirstGroupsLoad.current) {
          isFirstGroupsLoad.current = false;
          if (mergedGroups.length > 0) {
            setGroups(mergedGroups);
          } else if (currentGroups.current.length > 0) {
            // Only upload local-only groups (no ownerId yet) and remove any stale unowned/deleted ghosts
            const localUnownedGroups = currentGroups.current.filter(g => !g.ownerId);
            if (localUnownedGroups.length > 0) {
              const normalized = localUnownedGroups.map(g => ({
                ...g,
                ownerId: uid,
                memberIds: Array.from(new Set([uid, ...g.members.map(m => m.id)]))
              }));
              setGroups(normalized);
              Promise.all(
                normalized.map(g => createGroup(g, uid).catch(e => console.error('[Cloud Sync] Local group upload failed:', e)))
              );
            } else {
              setGroups([]);
            }
          }
        } else {
          setGroups(mergedGroups);
        }
        setHasLoadedGroupsFromCloud(true);
      },
      (err) => {
        console.error('[Cloud Sync] Groups listener error:', err);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Sync Personal Data
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const unsubscribe = syncUserData(
      uid,
      (data) => {
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
              lastReceivedPersonalExpenses.current = localExpensesStr;
              lastReceivedMembers.current = localMembersStr;
              updateUserData(uid, { personalExpenses: pExp, members: mems }).catch(console.error);
            }
          }
        } else {
          setPersonalExpenses(data.expenses);
          setMembers(data.members);
        }
        setHasLoadedPersonalFromCloud(true);
      },
      (err) => {
        console.error('[Cloud Sync] Personal listener error:', err);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Local Storage & Debounced Cloud Sync (Upstream)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    } catch (e) {
      console.error('[Storage] Failed saving groups:', e);
    }
  }, [groups]);

  useEffect(() => {
    const currentExpStr = JSON.stringify(personalExpenses);
    const currentMemsStr = JSON.stringify(members);

    try {
      localStorage.setItem(STORAGE_KEYS.PERSONAL_EXPENSES, currentExpStr);
      localStorage.setItem(STORAGE_KEYS.MEMBERS, currentMemsStr);
    } catch (e) {
      console.error('[Storage] Failed saving personal data:', e);
    }

    if (user && hasLoadedPersonalFromCloud && !isLoggingOut.current) {
      if (currentExpStr === lastReceivedPersonalExpenses.current && currentMemsStr === lastReceivedMembers.current) {
        pendingPersonalSyncRef.current = null;
        return;
      }

      if (personalExpenses.length > 0 || members.length > 0 || !isFirstPersonalLoad.current) {
        const uid = user.uid;
        const flushSync = () => {
          lastReceivedPersonalExpenses.current = currentExpStr;
          lastReceivedMembers.current = currentMemsStr;
          pendingPersonalSyncRef.current = null;
          updateUserData(uid, { personalExpenses, members }).catch(console.error);
        };

        pendingPersonalSyncRef.current = flushSync;
        const timer = setTimeout(flushSync, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [personalExpenses, members, user, hasLoadedPersonalFromCloud]);

  // Flush pending personal sync if user hides or leaves the page before debounce expires
  useEffect(() => {
    const handleFlush = () => {
      if (pendingPersonalSyncRef.current) {
        pendingPersonalSyncRef.current();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };
    window.addEventListener('pagehide', handleFlush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateTheme = React.useCallback((textureValue: string, sizeValue: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;

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
      default:
        root.style.setProperty('--color-ios-bg', '#F2F2F7');
    }

    switch (sizeValue) {
      case 'medium':
        root.style.setProperty('--app-font-scale', '1.1');
        break;
      case 'large':
        root.style.setProperty('--app-font-scale', '1.25');
        break;
      default:
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
    const normalized = isChineseLocale(lang) ? 'zh' : 'en';
    i18n.changeLanguage(normalized);
    setLanguageState(normalized);
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
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      console.error('Popup login failed:', error);

      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } catch (redirectError: any) {
          console.error('Redirect fallback failed:', redirectError);
          if (redirectError.code === 'auth/unauthorized-domain') {
            setAuthError(
              `登入失敗：未授權的網域 (auth/unauthorized-domain)。\n\n` +
              `🎉 您已成功將 App 設定為您的 Firebase 專案「${firebaseConfig.projectId}」！\n` +
              `為了安全起見，您需要允許目前的測試網域進行 Google 登入。\n\n` +
              `【解決步驟】：\n` +
              `1. 進入您的 Firebase 控制台：\n` +
              `   👉 https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers\n` +
              `2. 點擊上方的「設定 (Settings)」頁籤。\n` +
              `3. 點擊左側的「已授權網域 (Authorized domains)」。\n` +
              `4. 點擊「新增網域 (Add domain)」，並貼上此網域：\n` +
              `   🔹 ${window.location.hostname}\n` +
              `5. 儲存後等候約 10~30 秒，重新整理此網頁再試一次即可成功登入！`
            );
          } else {
            setAuthError(redirectError.message || 'Login failed');
          }
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError(
          `登入失敗：未授權的網域 (auth/unauthorized-domain)。\n\n` +
          `🎉 您已成功將 App 設定為您的 Firebase 專案「${firebaseConfig.projectId}」！\n` +
          `為了安全起見，您需要允許目前的測試網域進行 Google 登入。\n\n` +
          `【解決步驟】：\n` +
          `1. 進入您的 Firebase 控制台：\n` +
          `   👉 https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers\n` +
          `2. 點擊上方的「設定 (Settings)」頁籤。\n` +
          `3. 點擊左側的「已授權網域 (Authorized domains)」。\n` +
          `4. 點擊「新增網域 (Add domain)」，並貼上此網域：\n` +
          `   🔹 ${window.location.hostname}\n` +
          `5. 儲存後等候約 10~30 秒，重新整理此網頁再試一次即可成功登入！`
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
    pendingPersonalSyncRef.current = null;
    try {
      await signOut(auth);
      setGroups([]);
      setPersonalExpenses([]);
      setMembers([]);
      localStorage.removeItem(STORAGE_KEYS.GROUPS);
      localStorage.removeItem(STORAGE_KEYS.PERSONAL_EXPENSES);
      localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    } finally {
      isLoggingOut.current = false;
    }
  }, []);

  const addPersonalExpense = React.useCallback((expense: Expense) => {
    setPersonalExpenses(prev => [expense, ...prev]);
  }, []);

  const addMember = React.useCallback((m: Member) => setMembers(prev => [...prev, m]), []);
  const removeMember = React.useCallback((id: string) => setMembers(prev => prev.filter(m => m.id !== id)), []);

  const addGroup = React.useCallback(async (newGroup: Group) => {
    const groupWithOwner = user ? { ...newGroup, ownerId: user.uid, memberIds: [user.uid] } : newGroup;
    setGroups(prev => [groupWithOwner, ...prev]);
    if (user) {
      try {
        await createGroup(groupWithOwner, user.uid);
      } catch (e) {
        setGroups(prev => prev.filter(g => g.id !== newGroup.id));
        throw e;
      }
    }
  }, [user]);

  const updateGroup = React.useCallback(async (updatedGroup: Group) => {
    const previousGroups = currentGroups.current;
    setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
    if (user) {
      try {
        await updateGroupDetails(updatedGroup.id, updatedGroup);
      } catch (e) {
        setGroups(previousGroups);
        throw e;
      }
    }
  }, [user]);

  const removeGroup = React.useCallback(async (id: string) => {
    const previousGroups = currentGroups.current;
    setGroups(prev => prev.filter(g => g.id !== id));
    if (user) {
      try {
        await deleteGroup(id);
      } catch (e) {
        setGroups(previousGroups);
        throw e;
      }
    }
  }, [user]);

  const saveGroupExpense = React.useCallback(async (groupId: string, expense: Expense) => {
    if (user) {
      try {
        await upsertGroupExpense(groupId, expense);
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        const targetGroup = currentGroups.current.find(g => g.id === groupId);
        const isPermErr = msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied');
        if (isPermErr && targetGroup) {
          const status = await ensureGroupSyncedOnCloud(targetGroup, user.uid);
          if (status === 'created' || status === 'repaired') {
            const syncedGroup: Group = {
              ...targetGroup,
              ownerId: targetGroup.ownerId || user.uid,
              memberIds: Array.from(new Set([user.uid, ...targetGroup.members.map(m => m.id)]))
            };
            setGroups(prev => prev.map(g => (g.id === groupId ? syncedGroup : g)));
            await upsertGroupExpense(groupId, expense);
            return;
          }
          if (status === 'exists_authorized') {
            throw new Error('firestore_rules_outdated');
          }
        }
        throw err;
      }
    } else {
      setGroups(prev =>
        prev.map(g => {
          if (g.id !== groupId) return g;
          const exists = g.expenses.some(e => e.id === expense.id);
          return {
            ...g,
            expenses: exists
              ? g.expenses.map(e => (e.id === expense.id ? expense : e))
              : [...g.expenses, expense]
          };
        })
      );
    }
  }, [user]);

  const removeGroupExpense = React.useCallback(async (groupId: string, expenseId: string) => {
    if (user) {
      await deleteGroupExpense(groupId, expenseId);
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId && g.expenses.some(e => e.id === expenseId)
            ? { ...g, expenses: g.expenses.filter(e => e.id !== expenseId) }
            : g
        )
      );
    } else {
      setGroups(prev =>
        prev.map(g =>
          g.id === groupId
            ? { ...g, expenses: g.expenses.filter(e => e.id !== expenseId) }
            : g
        )
      );
    }
  }, [user]);

  const joinSharedGroup = React.useCallback(async (groupId: string) => {
    if (!user) throw new Error('not_logged_in');
    const updatedGroup = await joinGroup(groupId, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL
    });
    if (updatedGroup) {
      recentlyJoinedGroupsRef.current.set(updatedGroup.id, updatedGroup);
      setGroups(prev => {
        if (prev.some(g => g.id === updatedGroup.id)) {
          return prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g));
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
    saveGroupExpense,
    removeGroupExpense,
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
    removeMember, addGroup, updateGroup, removeGroup, saveGroupExpense,
    removeGroupExpense, joinSharedGroup,
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
