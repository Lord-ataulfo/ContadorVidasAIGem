import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Swords, Skull } from 'lucide-react';
import { Player, GameType } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerCardProps {
  player: Player;
  players: Player[];
  onLifeChange: (playerId: number, amount: number) => void;
  onPoisonChange: (playerId: number, amount: number) => void;
  onCommanderDamageClick: (playerId: number) => void;
  gameType: GameType;
  totalPlayers: number;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  players,
  onLifeChange, 
  onPoisonChange,
  onCommanderDamageClick,
  gameType,
  totalPlayers 
}) => {
  const [change, setChange] = useState<number | null>(null);
  const [poisonChange, setPoisonChange] = useState<number | null>(null);
  const changeTimeout = useRef<NodeJS.Timeout | null>(null);
  const poisonChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleLifeChange = (amount: number) => {
    onLifeChange(player.id, amount);
    setChange(prev => (prev || 0) + amount);

    if (changeTimeout.current) clearTimeout(changeTimeout.current);
    changeTimeout.current = setTimeout(() => {
      setChange(null);
    }, 2000);
  };

  const handlePoisonChange = (amount: number) => {
    onPoisonChange(player.id, amount);
    setPoisonChange(prev => (prev || 0) + amount);

    if (poisonChangeTimeout.current) clearTimeout(poisonChangeTimeout.current);
    poisonChangeTimeout.current = setTimeout(() => {
      setPoisonChange(null);
    }, 2000);
  };

  const commanderDamageTotal = (Object.values(player.commanderDamage) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-4 transition-all duration-500 overflow-hidden min-h-[300px] ${
        player.isEliminated ? 'grayscale opacity-60' : ''
      }`}
      style={{ backgroundColor: player.color }}
    >
      {/* Background Image - Wolf-themed fantasy art */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`https://images.unsplash.com/photo-${['1590420485404-f86d22b8abf8', '1557008075-7f2c5efa4cfd', '1551028150-64b9f398f678', '1590420485404-f86d22b8abf8', '1557008075-7f2c5efa4cfd', '1551028150-64b9f398f678', '1590420485404-f86d22b8abf8', '1557008075-7f2c5efa4cfd'][player.id % 8]}?auto=format&fit=crop&q=80&w=800`}
          alt=""
          className="w-full h-full object-cover opacity-40 mix-blend-multiply"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
      </div>

      <div className="z-10 flex flex-col items-center gap-2 w-full max-w-[200px]">
        <span className="text-sm font-serif font-bold uppercase tracking-widest opacity-90 drop-shadow-lg">
          {player.name}
        </span>

        <div className="relative flex items-center justify-center w-full">
          <AnimatePresence mode="popLayout">
            <motion.span 
              key={player.life}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ 
                opacity: 1, 
                scale: [1, 1.1, 1],
                y: 0 
              }}
              transition={{
                scale: { duration: 0.2 },
                opacity: { duration: 0.2 },
                y: { duration: 0.2 }
              }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="text-7xl sm:text-8xl font-black tabular-nums drop-shadow-2xl"
            >
              {player.life}
            </motion.span>
          </AnimatePresence>

          <AnimatePresence>
            {change !== null && (
              <motion.div
                key="life-change-indicator"
                initial={{ opacity: 0, x: 20, scale: 0.5 }}
                animate={{ opacity: 1, x: 40, scale: 1.2 }}
                exit={{ opacity: 0, x: 60, scale: 0.5 }}
                className={`absolute font-black text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${
                  change > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {change > 0 ? `+${change}` : change}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-4 w-full">
          <button 
            onClick={() => handleLifeChange(-1)}
            onContextMenu={(e) => { e.preventDefault(); handleLifeChange(-5); }}
            className="flex-1 aspect-square rounded-2xl bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors active:scale-95"
          >
            <Minus className="w-8 h-8" />
          </button>
          <button 
            onClick={() => handleLifeChange(1)}
            onContextMenu={(e) => { e.preventDefault(); handleLifeChange(5); }}
            className="flex-1 aspect-square rounded-2xl bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors active:scale-95"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* Poison Counter */}
        <div className="mt-4 flex flex-col items-center gap-1 w-full">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70">
            <Skull className="w-3 h-3" />
            Poison
          </div>
          <div className="relative flex items-center justify-center gap-4 w-full">
            <button 
              onClick={() => handlePoisonChange(-1)}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 transition-colors active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <span className={`text-2xl font-black tabular-nums ${player.poisonDamage >= 8 ? 'text-rose-400' : 'text-white'}`}>
                {player.poisonDamage}
              </span>
              <AnimatePresence>
                {poisonChange !== null && (
                  <motion.div
                    key="poison-change-indicator"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 20 }}
                    exit={{ opacity: 0, y: 30 }}
                    className={`absolute left-1/2 -translate-x-1/2 font-bold text-sm ${
                      poisonChange > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {poisonChange > 0 ? `+${poisonChange}` : poisonChange}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => handlePoisonChange(1)}
              className="p-2 rounded-xl bg-black/20 hover:bg-black/30 transition-colors active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {gameType === 'commander' && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1">
          <button 
            onClick={() => onCommanderDamageClick(player.id)}
            className="p-2 rounded-xl bg-black/20 hover:bg-black/30 transition-colors active:scale-90"
          >
            <Swords className="w-4 h-4" />
          </button>
          
          <div className="flex flex-wrap justify-end gap-1.5 max-w-[140px]">
            {(Object.entries(player.commanderDamage) as [string, number][])
              .filter(([_, damage]) => damage > 0)
              .map(([sourceId, damage]) => {
                const sourcePlayer = players.find(p => p.id === parseInt(sourceId));
                return (
                  <div 
                    key={`cd-${sourceId}`}
                    className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 border border-white/10"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: sourcePlayer?.color || '#fff' }}
                    />
                    <span className="opacity-80">{sourcePlayer?.name || `P${parseInt(sourceId) + 1}`}:</span>
                    <span className={damage >= 15 ? 'text-rose-400' : ''}>{damage}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {player.isEliminated && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <span className="text-4xl font-black uppercase tracking-tighter rotate-[-15deg] border-4 border-rose-500 text-rose-500 px-4 py-1 rounded-lg">
            Eliminated
          </span>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
