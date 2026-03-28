import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Trophy, Clock, Calendar, ChevronRight } from 'lucide-react';
import { GameRecord } from '../types.ts';
import { getGameHistory } from '../services/gameService.ts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getGameHistory();
    setHistory(data);
    setLoading(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Game History</h2>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Your recent battles</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                    <History className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-white font-bold">No games recorded yet</p>
                    <p className="text-zinc-500 text-sm">Your completed games will appear here.</p>
                  </div>
                </div>
              ) : (
                history.map((record) => (
                  <div 
                    key={record.id}
                    className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 hover:border-emerald-500/30 transition-all group"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            record.gameType === 'commander' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {record.gameType}
                          </span>
                          <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {formatDate(record.endTime)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-500">
                          <Trophy className="w-4 h-4" />
                          <span className="font-black uppercase tracking-tight">Winner: {record.winnerName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/5">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs font-mono font-bold text-zinc-300">{formatDuration(record.duration)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {record.players.map((player, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 rounded-2xl border ${
                            player.name === record.winnerName 
                              ? 'bg-emerald-500/5 border-emerald-500/20' 
                              : 'bg-zinc-950/50 border-white/5'
                          }`}
                        >
                          <p className={`text-[10px] font-black uppercase tracking-tight truncate ${
                            player.name === record.winnerName ? 'text-emerald-500' : 'text-zinc-400'
                          }`}>
                            {player.name}
                          </p>
                          <p className="text-lg font-mono font-bold text-white">{player.life}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
