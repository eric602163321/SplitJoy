import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
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

// Users collection
export const syncUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const path = 'groups';
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, 
    (snapshot) => {
      const groups = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Recover ownerId and name from either root-level or nested members map
        const ownerId = data.ownerId || (data.members && typeof data.members === 'object' && !Array.isArray(data.members) && (data.members as any).ownerId) || userId;
        const name = data.name || (data.members && typeof data.members === 'object' && !Array.isArray(data.members) && (data.members as any).name) || 'Unnamed Group';
        
        // Ensure members is an array of Member objects
        let membersArray: Member[] = [];
        if (Array.isArray(data.members)) {
          membersArray = data.members;
        } else {
          // Fallback: If it was a map, or missing, seed it with the owner as the first member if we can
          membersArray = [{
            id: ownerId,
            name: name === 'Unnamed Group' ? 'Group Owner' : '團體建立者',
            avatar: '1'
          }];
        }

        const expensesArray = Array.isArray(data.expenses) ? data.expenses : [];
        const memberIds = data.memberIds || [ownerId];

        return {
          id: doc.id,
          name,
          currency: data.currency || 'TWD',
          createdAt: data.createdAt || new Date().toISOString(),
          ownerId,
          memberIds,
          members: membersArray,
          expenses: expensesArray
        } as Group;
      });
      callback(groups);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const createGroup = async (group: Group, userId: string) => {
  const path = `groups/${group.id}`;
  try {
    const groupRef = doc(db, 'groups', group.id);
    const memberIds = Array.from(new Set([userId, ...group.members.map(m => m.id)]));
    await setDoc(groupRef, {
      ...group,
      ownerId: userId,
      memberIds: memberIds
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateGroupDetails = async (groupId: string, data: Partial<Group>) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(groupRef);
    
    if (!docSnap.exists()) return;
    const currentData = docSnap.data();
    
    // Schema recovery for ownerId and name
    const ownerId = currentData.ownerId || (currentData.members && typeof currentData.members === 'object' && !Array.isArray(currentData.members) && (currentData.members as any).ownerId);
    const name = currentData.name || (currentData.members && typeof currentData.members === 'object' && !Array.isArray(currentData.members) && (currentData.members as any).name);

    const updateData: any = { ...data };
    
    // Migrate missing root-level fields to ensure schema correctness and backward compatibility
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
      updateData.currency = currentData.currency || 'TWD';
    }
    if (!currentData.createdAt && !updateData.createdAt) {
      updateData.createdAt = currentData.createdAt || new Date().toISOString();
    }
    if (!currentData.expenses && !updateData.expenses) {
      updateData.expenses = Array.isArray(currentData.expenses) ? currentData.expenses : [];
    }

    if (data.members) {
      const ids = data.members.map(m => m.id);
      const effectiveOwnerId = ownerId || data.ownerId;
      if (effectiveOwnerId && !ids.includes(effectiveOwnerId)) {
        ids.push(effectiveOwnerId);
      }
      updateData.memberIds = Array.from(new Set(ids));
    }
    
    await updateDoc(groupRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addExpenseToGroup = async (groupId: string, expense: Expense) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      expenses: arrayUnion(expense)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeExpenseFromGroup = async (groupId: string, expense: Expense) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      expenses: arrayRemove(expense)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addMemberToGroup = async (groupId: string, member: Member) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(member),
      memberIds: arrayUnion(member.id)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const removeMemberFromGroup = async (groupId: string, memberId: string) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
      const group = docSnap.data() as Group;
      const updatedMembers = group.members.filter(m => m.id !== memberId);
      await updateDoc(groupRef, {
        members: updatedMembers,
        memberIds: arrayRemove(memberId)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Sync user-specific data (personal expenses and members)
export const syncUserData = (userId: string, callback: (data: { expenses: Expense[], members: Member[] }) => void) => {
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, 
    (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : {};
      callback({
        expenses: data.personalExpenses || [],
        members: data.members || []
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const updateUserData = async (userId: string, data: { personalExpenses?: Expense[], members?: Member[] }) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    console.log("Updating user data in Firestore for:", userId, Object.keys(data));
    await setDoc(userRef, data, { merge: true });
    console.log("User data updated successfully");
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

export const joinGroup = async (groupId: string, user: { uid: string, displayName: string | null, photoURL: string | null }) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(groupRef);
    if (!docSnap.exists()) {
      throw new Error('group_not_found');
    }
    const rawData = docSnap.data();
    
    // Recover ownerId and group name from either root level or nested map
    const ownerId = rawData.ownerId || (rawData.members && typeof rawData.members === 'object' && !Array.isArray(rawData.members) && (rawData.members as any).ownerId) || user.uid;
    const name = rawData.name || (rawData.members && typeof rawData.members === 'object' && !Array.isArray(rawData.members) && (rawData.members as any).name) || 'Unnamed Group';
    
    // Ensure members is fetched as a valid array
    let membersArray: Member[] = [];
    if (Array.isArray(rawData.members)) {
      membersArray = rawData.members;
    } else {
      membersArray = [{
        id: ownerId,
        name: name === 'Unnamed Group' ? 'Group Owner' : '團體建立者',
        avatar: '1'
      }];
    }

    const memberIds = rawData.memberIds || [ownerId];
    
    // Check if user is already a member
    if (memberIds.includes(user.uid)) {
      return {
        id: groupId,
        name,
        currency: rawData.currency || 'TWD',
        createdAt: rawData.createdAt || new Date().toISOString(),
        ownerId,
        memberIds,
        members: membersArray,
        expenses: Array.isArray(rawData.expenses) ? rawData.expenses : []
      } as Group;
    }

    // Determine a random avatar index from 1 to 16
    const avatarId = String(Math.floor(Math.random() * 16) + 1);

    const newMember: Member = {
      id: user.uid,
      name: user.displayName || 'Google User',
      avatar: avatarId
    };

    const updatedMembers = [...membersArray, newMember];
    const updatedMemberIds = Array.from(new Set([...memberIds, user.uid]));

    const updateData: any = {
      id: groupId,
      name,
      ownerId,
      members: updatedMembers,
      memberIds: updatedMemberIds
    };

    // Ensure currency, createdAt, and expenses are migrated to root level if missing
    if (!rawData.currency) {
      updateData.currency = rawData.currency || 'TWD';
    }
    if (!rawData.createdAt) {
      updateData.createdAt = rawData.createdAt || new Date().toISOString();
    }
    if (!rawData.expenses) {
      updateData.expenses = Array.isArray(rawData.expenses) ? rawData.expenses : [];
    }

    // Update group details in Firestore (migrates any stale/nested fields to root level)
    await updateDoc(groupRef, updateData);

    return {
      id: groupId,
      name,
      currency: rawData.currency || 'TWD',
      createdAt: rawData.createdAt || new Date().toISOString(),
      ownerId,
      memberIds: updatedMemberIds,
      members: updatedMembers,
      expenses: Array.isArray(rawData.expenses) ? rawData.expenses : []
    } as Group;
  } catch (error: any) {
    if (error.message === 'group_not_found') throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

