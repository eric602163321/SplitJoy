/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import StatsScreen from './components/StatsScreen';
import BottomNav from './components/BottomNav';
import { Tab, Group, Member, Expense } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const addMember = (m: Member) => setMembers(prev => [...prev, m]);
  const removeMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));

  const handleUpdateGroup = (updatedGroup: Group) => {
    setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
  };

  const handleAddGroup = (newGroup: Group) => {
    setGroups(prev => [...prev, newGroup]);
    setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-ios-bg)] flex flex-col items-center">
      <main className="flex-1 w-full max-w-xl mx-auto px-4 pb-[100px] pt-2 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-full"
          >
            {activeTab === 'personal' && <PersonalScreen />}
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
