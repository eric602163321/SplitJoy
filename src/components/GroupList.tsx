import React, { useState } from 'react';
import { ChevronDown, Trash2, Users, Calendar } from 'lucide-react';
import { Group } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface GroupListProps {
  groups: Group[];
  onSelectGroup: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  onStartCreate: () => void;
}

export default function GroupList({ groups, onSelectGroup, onDeleteGroup, onStartCreate }: GroupListProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[14px] font-bold text-[#8E8E93] uppercase tracking-wider">我的團體</h2>
        <button 
          onClick={onStartCreate}
          className="text-sm font-bold text-[#4285F4] active:opacity-50"
        >
          建立
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        {groups.length === 0 ? (
          <div className="ios-card flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center">
              <Users size={32} className="text-[#A0CFFF]" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-[17px] text-black">尚無團體</span>
              <span className="text-sm text-[#8E8E93] leading-relaxed">
                點查右上方「建立」來開始與朋友們分帳
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="ios-card group"
              >
                <div className="p-4 flex items-center justify-between">
                  <button 
                    onClick={() => onSelectGroup(group.id)}
                    className="flex-1 flex items-center gap-4 text-left outline-none"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#EBF4FF] flex items-center justify-center">
                      <Users size={24} className="text-[#4285F4]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[17px] text-black">{group.name}</span>
                      <div className="flex items-center gap-2 text-[12px] text-[#8E8E93] font-medium">
                        <span>{group.members.length} 位成員</span>
                        <span>·</span>
                        <span>{group.currency}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-2 text-[#C7C7CC] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
