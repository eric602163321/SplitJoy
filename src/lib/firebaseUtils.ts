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
import { db } from './firebase';
import { Group, Member, Expense } from '../types';

// Users collection
export const syncUserGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, 
    (snapshot) => {
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      callback(groups);
    },
    (error) => {
      console.error("Error syncing groups:", error);
    }
  );
};

export const createGroup = async (group: Group, userId: string) => {
  const groupRef = doc(db, 'groups', group.id);
  const memberIds = Array.from(new Set([userId, ...group.members.map(m => m.id)]));
  await setDoc(groupRef, {
    ...group,
    ownerId: userId,
    memberIds: memberIds
  });
};

export const updateGroupDetails = async (groupId: string, data: Partial<Group>) => {
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
};

export const addExpenseToGroup = async (groupId: string, expense: Expense) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    expenses: arrayUnion(expense)
  });
};

export const removeExpenseFromGroup = async (groupId: string, expense: Expense) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    expenses: arrayRemove(expense)
  });
};

export const addMemberToGroup = async (groupId: string, member: Member) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, {
    members: arrayUnion(member),
    memberIds: arrayUnion(member.id)
  });
};

export const removeMemberFromGroup = async (groupId: string, memberId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  // This is a bit complex for arrayRemove of objects, might need to get doc first
  const docSnap = await getDoc(groupRef);
  if (docSnap.exists()) {
    const group = docSnap.data() as Group;
    const updatedMembers = group.members.filter(m => m.id !== memberId);
    await updateDoc(groupRef, {
      members: updatedMembers,
      memberIds: arrayRemove(memberId)
    });
  }
};

// Sync user-specific data (personal expenses and members)
export const syncUserData = (userId: string, callback: (data: { expenses: Expense[], members: Member[] }) => void) => {
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
      console.error("Error syncing user data:", error);
    }
  );
};

export const updateUserData = async (userId: string, data: { personalExpenses?: Expense[], members?: Member[] }) => {
  try {
    const userRef = doc(db, 'users', userId);
    console.log("Updating user data in Firestore for:", userId, Object.keys(data));
    await setDoc(userRef, data, { merge: true });
    console.log("User data updated successfully");
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};

export const deleteGroup = async (groupId: string) => {
  const groupRef = doc(db, 'groups', groupId);
  await deleteDoc(groupRef);
};
