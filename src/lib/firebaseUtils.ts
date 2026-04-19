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
  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
    callback(groups);
  });
};

export const createGroup = async (group: Group, userId: string) => {
  const groupRef = doc(db, 'groups', group.id);
  await setDoc(groupRef, {
    ...group,
    ownerId: userId,
    memberIds: [userId] // Initially just the owner
  });
};

export const updateGroupDetails = async (groupId: string, data: Partial<Group>) => {
  const groupRef = doc(db, 'groups', groupId);
  await updateDoc(groupRef, data);
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
