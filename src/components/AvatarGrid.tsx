import React from 'react';
import { motion } from 'motion/react';

export const AVATARS = [
  { id: '1', emoji: '😀' },
  { id: '2', emoji: '🤩' },
  { id: '3', emoji: '🦊' },
  { id: '4', emoji: '🐻' },
  { id: '5', emoji: '🐼' },
  { id: '6', emoji: '🦁' },
  { id: '7', emoji: '🐯' },
  { id: '8', emoji: '🐸' },
  { id: '9', emoji: '😈' },
  { id: '10', emoji: '👽' },
  { id: '11', emoji: '🤡' },
  { id: '12', emoji: '😶‍🌫️' },
  { id: '13', emoji: '🥶' },
  { id: '14', emoji: '😡' },
  { id: '15', emoji: '🥸' },
  { id: '16', emoji: '👻' },
];

interface AvatarGridProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function AvatarGrid({ selectedId, onSelect }: AvatarGridProps) {
  return (
    <div className="flex flex-wrap gap-3.5 px-1 justify-start">
      {AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          onClick={() => onSelect(avatar.id)}
          className={`
            w-[32px] h-[32px] rounded-full flex items-center justify-center text-base transition-all duration-200 relative
            ${selectedId === avatar.id 
              ? 'bg-[#4285F4] shadow-sm ring-[1.5px] ring-white ring-offset-1 ring-offset-[#4285F4]' 
              : 'bg-[#F2F2F7] hover:bg-gray-200'}
          `}
        >
          <span className="transform active:scale-110 transition-transform">
            {avatar.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}
