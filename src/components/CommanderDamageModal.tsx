import React from 'react';
import { Player } from '../types.ts';
import { X, Swords, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CommanderDamageModalProps {
  targetPlayer: Player;
  players: Player[];
  onClose: () => void;
  onDamageChange: (targetId: number, sourceId: number, amount: number) => void;
}

const CommanderDamageModal: React.FC<CommanderDamageModalProps> = ({ 
  targetPlayer, 
  players, 
  onClose, 
  onDamageChange 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Commander Damage</h2>
            <p className="text-sm text-zinc-400">Received by {targetPlayer.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {players.filter(p => p.id !== targetPlayer.id).map(sourcePlayer => {
            const damage = (targetPlayer.commanderDamage[sourcePlayer.id.toString()] as number | undefined) || 0;
            return (
              <div 
                key={sourcePlayer.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: sourcePlayer.color }}
                  />
                  <span className="font-medium">{sourcePlayer.name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onDamageChange(targetPlayer.id, sourcePlayer.id, -1)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-black w-8 text-center tabular-nums">
                    {damage}
                  </span>
                  <button 
                    onClick={() => onDamageChange(targetPlayer.id, sourcePlayer.id, 1)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 bg-white/5 text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
            21 Damage from one source = Elimination
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CommanderDamageModal;
