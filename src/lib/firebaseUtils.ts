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
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
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
    const ownerId = currentData.ownerId;

    const updateData: any = { ...data };
    if (data.members) {
      // Crucial: Always include ownerId in memberIds so they don't lose sync access
      const ids = data.members.map(m => m.id);
      if (ownerId && !ids.includes(ownerId)) {
        ids.push(ownerId);
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
    const groupData = docSnap.data() as Group & { ownerId: string, memberIds: string[] };
    
    // Check if user is already a member
    if (groupData.memberIds.includes(user.uid)) {
      return groupData;
    }

    // Determine a random avatar index from 1 to 16
    const avatarId = String(Math.floor(Math.random() * 16) + 1);

    const newMember: Member = {
      id: user.uid,
      name: user.displayName || 'Google User',
      avatar: avatarId
    };

    const updatedMembers = [...(groupData.members || []), newMember];
    const updatedMemberIds = Array.from(new Set([...(groupData.memberIds || []), user.uid]));

    // Update group details in Firestore
    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds
    });

    return { ...groupData, members: updatedMembers, memberIds: updatedMemberIds };
  } catch (error: any) {
    if (error.message === 'group_not_found') throw error;
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

