import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AvatarGrid, { AVATARS } from './AvatarGrid';
import { Member, Group } from '../types';
import { cn } from '../lib/utils';
import GroupList from './GroupList';
import CreateGroupForm from './CreateGroupForm';
import GroupDetailScreen from './GroupDetailScreen';

interface GroupScreenProps {
  groups: Group[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  onAddGroup: (group: Group) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateGroup: (group: Group) => void;
  members: Member[];
  onAddMember: (m: Member) => void;
  onRemoveMember: (id: string) => void;
}

export default function GroupScreen({ 
  groups, 
  selectedGroupId, 
  setSelectedGroupId, 
  onAddGroup, 
  onDeleteGroup, 
  onUpdateGroup,
  members,
  onAddMember,
  onRemoveMember
}: GroupScreenProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [name, setName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    const randomIndex = Math.floor(Math.random() * AVATARS.length);
    return AVATARS[randomIndex].id;
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleAddMember = () => {
    if (!name.trim()) return;
    onAddMember({
      id: Date.now().toString(),
      name: name.trim(),
      avatar: selectedAvatarId,
    });
    setName('');
    
    // Pick a random avatar for the next member
    const randomIndex = Math.floor(Math.random() * AVATARS.length);
    setSelectedAvatarId(AVATARS[randomIndex].id);
  };

  if (selectedGroup) {
    return (
      <GroupDetailScreen 
        group={selectedGroup}
        onUpdateGroup={onUpdateGroup}
        onBack={() => setSelectedGroupId(null)}
        allMembers={members}
      />
    );
  }

  if (isCreating) {
    return (
      <CreateGroupForm 
        onAddGroup={(g) => {
          onAddGroup(g);
          setIsCreating(false);
        }}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      <header className="px-1 pt-8 flex flex-col gap-1">
        <span className="text-[10px] font-bold text-[#8E8E93] tracking-widest uppercase">OVERVIEW</span>
        <h1 className="text-3xl font-extrabold text-black tracking-tight">團體清單</h1>
      </header>

      {/* Restore Member List Section above Group List */}
      <section className="flex flex-col gap-2">
        <div className="ios-card overflow-hidden">
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-black tracking-tight">成員名單</h2>
              <button 
                onClick={() => setIsAddingMember(!isAddingMember)}
                className="flex items-center gap-1 text-[15px] font-bold text-[#4285F4] active:opacity-50"
              >
                <Plus size={18} strokeWidth={3} />
                <span>新增</span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isAddingMember && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-6"
                >
                  <AvatarGrid selectedId={selectedAvatarId} onSelect={setSelectedAvatarId} />
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      placeholder="輸入名字"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#F2F2F7] border-none py-2.5 px-4 rounded-2xl text-[14px] placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-[#4285F4] transition-all"
                    />
                    <button 
                      onClick={handleAddMember} 
                      disabled={!name.trim()}
                      className={cn(
                        "w-full py-2.5 rounded-2xl font-bold text-[15px] transition-all shadow-sm",
                        name.trim() 
                          ? "bg-[#4285F4] text-white active:opacity-70" 
                          : "bg-[#A0CFFF] text-white opacity-80 cursor-not-allowed"
                      )}
                    >
                      加入成員
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {members.map((member) => (
                  <motion.div 
                    key={member.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-[#F2F2F7] pl-2 pr-2 py-1.5 rounded-full flex items-center gap-1.5 border border-gray-100 shadow-sm"
                  >
                    <span className="text-base leading-none">
                      {AVATARS.find(a => a.id === member.avatar)?.emoji || '👤'}
                    </span>
                    <span className="text-xs font-bold text-gray-700">{member.name}</span>
                    <button onClick={() => onRemoveMember(member.id)} className="text-[#8E8E93] hover:text-red-500 ml-1">
                      <Plus size={14} className="rotate-45" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
      
      <GroupList 
        groups={groups}
        onSelectGroup={setSelectedGroupId}
        onDeleteGroup={onDeleteGroup}
        onStartCreate={() => setIsCreating(true)}
      />
    </div>
  );
}
