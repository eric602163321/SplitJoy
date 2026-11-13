import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { stripUndefined, extractInviteCode } from './utils';
import { Group, Member, Expense } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function parseGroupDoc(docId: string, data: Record<string, any>, fallbackOwnerId: string): Group {
  const ownerId =
    data.ownerId ||
    (data.members && typeof data.members === 'object' && !Array.isArray(data.members) && data.members.ownerId) ||
    fallbackOwnerId;
  const name =
    data.name ||
    (data.members && typeof data.members === 'object' && !Array.isArray(data.members) && data.members.name) ||
    'Unnamed Group';

  let membersArray: Member[] = [];
  if (Array.isArray(data.members)) {
    membersArray = data.members;
  } else {
    membersArray = [{
      id: ownerId,
      name: name === 'Unnamed Group' ? 'Group Owner' : '團體建立者',
      avatar: '1'
    }];
  }

  const expensesArray = Array.isArray(data.expenses) ? data.expenses : [];
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [ownerId];

  return {
    id: docId,
    name,
    currency: data.currency || 'TWD',
    createdAt: data.createdAt || new Date().toISOString(),
    ownerId,
    memberIds,
    members: membersArray,
    expenses: expensesArray
  };
}

// Subscribe to user's shared groups
export const syncUserGroups = (
  userId: string,
  callback: (groups: Group[]) => void,
  onError?: (error: Error) => void
) => {
  const path = 'groups';
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map(d => parseGroupDoc(d.id, d.data(), userId));
      callback(groups);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
};

// Subscribe to group expenses subcollection in real time
export const syncGroupExpenses = (
  groupId: string,
  callback: (expenses: Expense[]) => void,
  onError?: (error: Error) => void
) => {
  const path = `groups/${groupId}/expenses`;
  const expensesRef = collection(db, 'groups', groupId, 'expenses');
  return onSnapshot(
    expensesRef,
    (snapshot) => {
      const expenses = snapshot.docs.map(d => ({
        ...(d.data() as Expense),
        id: d.id
      }));
      expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      callback(expenses);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
};

// Migrate legacy array-based expenses on groups/{groupId} into subcollection
export const migrateLegacyExpensesIfNeeded = async (groupId: string, legacyExpenses: Expense[]) => {
  if (!legacyExpenses || legacyExpenses.length === 0) return;
  const path = `groups/${groupId}/expenses`;
  try {
    const batch = writeBatch(db);
    legacyExpenses.forEach(exp => {
      const raw = exp as any;
      const safeId = typeof exp.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(exp.id)
        ? exp.id
        : `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const expRef = doc(db, 'groups', groupId, 'expenses', safeId);
      const totalAmount = typeof exp.totalAmount === 'number' && !isNaN(exp.totalAmount)
        ? Math.max(0, exp.totalAmount)
        : Math.max(0, Number(raw.amount) || 0);
      const splitType = exp.splitType === 'custom' ? 'custom' : 'equal';
      const sanitized: Record<string, any> = {
        id: safeId,
        totalAmount,
        description: typeof exp.description === 'string' ? exp.description.slice(0, 200) : '',
        date: typeof exp.date === 'string' && exp.date ? exp.date.slice(0, 64) : new Date().toISOString(),
        category: typeof exp.category === 'string' && exp.category ? exp.category.slice(0, 64) : 'others',
        payerId: typeof exp.payerId === 'string' && exp.payerId ? exp.payerId.slice(0, 128) : (auth.currentUser?.uid || 'unknown'),
        splitType,
        splits: Array.isArray(exp.splits) ? exp.splits.slice(0, 50) : [],
        createdBy: exp.createdBy || auth.currentUser?.uid,
      };
      if (typeof exp.notes === 'string') sanitized.notes = exp.notes.slice(0, 500);
      if (typeof exp.originalAmount === 'number' && !isNaN(exp.originalAmount) && exp.originalAmount >= 0) {
        sanitized.originalAmount = exp.originalAmount;
      }
      if (typeof exp.originalCurrency === 'string' && exp.originalCurrency) {
        sanitized.originalCurrency = exp.originalCurrency.slice(0, 16);
      }
      if (typeof exp.exchangeRate === 'number' && exp.exchangeRate > 0) {
        sanitized.exchangeRate = exp.exchangeRate;
      }
      if (exp.splitWeights && typeof exp.splitWeights === 'object') {
        sanitized.splitWeights = exp.splitWeights;
      }
      batch.set(expRef, stripUndefined(sanitized));
    });
    const groupRef = doc(db, 'groups', groupId);
    batch.update(groupRef, { expenses: [] });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const upsertGroupExpense = async (groupId: string, expense: Expense) => {
  const path = `groups/${groupId}/expenses/${expense.id}`;
  try {
    const expRef = doc(db, 'groups', groupId, 'expenses', expense.id);
    const payload = stripUndefined({
      ...expense,
      createdBy: expense.createdBy || auth.currentUser?.uid
    });
    await setDoc(expRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteGroupExpense = async (groupId: string, expenseId: string) => {
  const path = `groups/${groupId}/expenses/${expenseId}`;
  try {
    const expRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    await deleteDoc(expRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const createGroup = async (group: Group, userId: string) => {
  const path = `groups/${group.id}`;
  try {
    const batch = writeBatch(db);
    const groupRef = doc(db, 'groups', group.id);
    const memberIds = Array.from(new Set([userId, ...group.members.map(m => m.id)]));

    batch.set(
      groupRef,
      stripUndefined({
        id: group.id,
        name: group.name,
        currency: group.currency || 'TWD',
        createdAt: group.createdAt || new Date().toISOString(),
        ownerId: userId,
        members: group.members,
        memberIds,
        expenses: []
      })
    );

    if (group.expenses && group.expenses.length > 0) {
      group.expenses.forEach(exp => {
        const expRef = doc(db, 'groups', group.id, 'expenses', exp.id);
        batch.set(
          expRef,
          stripUndefined({
            ...exp,
            createdBy: userId
          })
        );
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateGroupDetails = async (groupId: string, data: Partial<Group>) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(groupRef);
      if (!docSnap.exists()) return;
      const currentData = docSnap.data();

      const ownerId =
        currentData.ownerId ||
        (currentData.members && typeof currentData.members === 'object' && !Array.isArray(currentData.members) && currentData.members.ownerId);
      const name =
        currentData.name ||
        (currentData.members && typeof currentData.members === 'object' && !Array.isArray(currentData.members) && currentData.members.name);

      // Exclude expenses from metadata update when subcollection is used unless explicitly provided
      const { expenses: _ignoredExpenses, ...metaPatch } = data;
      const updateData: Record<string, any> = stripUndefined({ ...metaPatch });

      if (ownerId && !updateData.ownerId) {
        updateData.ownerId = ownerId;
      }
      if (name && !updateData.name) {
        updateData.name = name;
      }
      if (!currentData.id && !updateData.id) {
        updateData.id = groupId;
      }
      if (!currentData.currency && !updateData.currency) {
        updateData.currency = 'TWD';
      }
      if (!currentData.createdAt && !updateData.createdAt) {
        updateData.createdAt = new Date().toISOString();
      }
      if (currentData.expenses === undefined) {
        updateData.expenses = [];
      }

      if (data.members) {
        const ids = data.members.map(m => m.id);
        const effectiveOwnerId = ownerId || data.ownerId;
        if (effectiveOwnerId && !ids.includes(effectiveOwnerId)) {
          ids.push(effectiveOwnerId);
        }
        updateData.memberIds = Array.from(new Set(ids));
      }

      transaction.update(groupRef, updateData);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Sync user-specific data (personal expenses and members)
export const syncUserData = (
  userId: string,
  callback: (data: { expenses: Expense[], members: Member[] }) => void,
  onError?: (error: Error) => void
) => {
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      callback({
        expenses: data.personalExpenses || [],
        members: data.members || []
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
};

export const updateUserData = async (userId: string, data: { personalExpenses?: Expense[], members?: Member[] }) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, stripUndefined(data), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteGroup = async (groupId: string) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const joinGroup = async (
  rawGroupId: string,
  user: { uid: string; displayName: string | null; photoURL: string | null }
): Promise<Group> => {
  const groupId = extractInviteCode(rawGroupId);
  if (!groupId) {
    throw new Error('group_not_found');
  }
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    return await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(groupRef);
      if (!docSnap.exists()) {
        throw new Error('group_not_found');
      }
      const rawData = docSnap.data();
      const parsed = parseGroupDoc(groupId, rawData, user.uid);
      const memberIds = parsed.memberIds || [parsed.ownerId!];

      if (memberIds.includes(user.uid)) {
        return parsed;
      }

      const hasExistingMember = parsed.members.some(m => m.id === user.uid);
      if (memberIds.length >= 50 || (!hasExistingMember && parsed.members.length >= 50)) {
        throw new Error('group_full');
      }

      const avatarId = String(Math.floor(Math.random() * 16) + 1);
      const newMember: Member = {
        id: user.uid,
        name: user.displayName || 'Google User',
        avatar: avatarId
      };

      const updatedMembers = hasExistingMember ? parsed.members : [...parsed.members, newMember];
      const updatedMemberIds = Array.from(new Set([...memberIds, user.uid]));

      // Strictly only modify members & memberIds when group schema is already complete
      const hasAllRootFields =
        typeof rawData.id === 'string' &&
        typeof rawData.name === 'string' &&
        typeof rawData.ownerId === 'string' &&
        typeof rawData.currency === 'string' &&
        typeof rawData.createdAt === 'string' &&
        Array.isArray(rawData.members);

      if (hasAllRootFields) {
        transaction.update(groupRef, {
          members: updatedMembers,
          memberIds: updatedMemberIds
        });
      } else {
        transaction.update(
          groupRef,
          stripUndefined({
            id: groupId,
            name: parsed.name,
            ownerId: parsed.ownerId,
            currency: parsed.currency,
            createdAt: parsed.createdAt,
            members: updatedMembers,
            memberIds: updatedMemberIds,
            expenses: parsed.expenses
          })
        );
      }

      return {
        ...parsed,
        memberIds: updatedMemberIds,
        members: updatedMembers
      };
    });
  } catch (error: any) {
    if (error.message === 'group_not_found' || error.message === 'group_full') throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
