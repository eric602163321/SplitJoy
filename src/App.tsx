/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from './contexts/DataContext';
import PersonalScreen from './components/PersonalScreen';
import GroupScreen from './components/GroupScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { Tab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const {
    user,
    groups,
    personalExpenses,
    members,
    authError,
    handleLogin,
    handleLogout,
    setPersonalExpenses,
    addMember,
    removeMember,
    addGroup,
    updateGroup,
    removeGroup
  } = useData();

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
                onAddGroup={addGroup}
                onDeleteGroup={removeGroup}
                onUpdateGroup={updateGroup}
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
