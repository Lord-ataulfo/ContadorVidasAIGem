import React, { useState, useEffect } from 'react';
import { Swords, Check, Loader2, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CommanderCard, Player, GameState } from '../types.ts';
import { listenToCommanders } from '../services/authService.ts';

interface CommanderWaitingModalProps {
  gameState: GameState;
  currentUserUid: string;
  onSelectCommander: (commander: CommanderCard | null) => void;
  onReady: () => void;
}

export const CommanderWaitingModal: React.FC<CommanderWaitingModalProps> = ({
  gameState,
  currentUserUid,
  onSelectCommander,
  onReady
}) => {
  const [savedCommanders, setSavedCommanders] = useState<CommanderCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const currentPlayer = gameState.players.find(p => p.uid === currentUserUid);
  const isHost = gameState.hostUid === currentUserUid;
  const readyPlayers = gameState.readyPlayers || [];
  const joinedUids = gameState.joinedUids || [];
  
  // Registered players who need to select a commander
  const registeredPlayers = gameState.players.filter(p => p.uid);
  
  // We only wait for players who have actually joined the session
  const allReady = joinedUids.length > 0 && joinedUids.every(uid => readyPlayers.includes(uid));

  useEffect(() => {
    if (currentUserUid) {
      const unsubscribe = listenToCommanders(currentUserUid, (list) => {
        setSavedCommanders(list);
      });
      return () => unsubscribe();
    }
  }, [currentUserUid]);

  // If all ready and I am host, the game will start automatically via App.tsx logic
  // but we show a loading state here
  
  const handleSelect = (commander: CommanderCard | null) => {
    setSelectedId(commander?.id || 'none');
    onSelectCommander(commander);
  };

  const handleReady = () => {
    setIsReady(true);
    onReady();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-emerald-500 tracking-tight uppercase">Preparando Batalla</h2>
          <p className="text-zinc-400 text-sm">Selecciona tu comandante para iniciar la partida</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Players Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {registeredPlayers.map((p) => {
              const isPlayerReady = readyPlayers.includes(p.uid!);
              const isPlayerJoined = joinedUids.includes(p.uid!);
              
              return (
                <div key={p.uid} className="flex flex-col items-center gap-2">
                  <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPlayerReady ? 'border-emerald-500 bg-emerald-500/20' : 
                    isPlayerJoined ? 'border-zinc-400 bg-zinc-900' :
                    'border-zinc-800 bg-zinc-950 opacity-40'
                  }`}>
                    {p.photoURL ? (
                      <img src={p.photoURL} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className={`w-6 h-6 ${isPlayerReady ? 'text-emerald-500' : 'text-zinc-700'}`} />
                    )}
                    {isPlayerReady && (
                      <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                        <Check className="w-3 h-3 text-zinc-950" />
                      </div>
                    )}
                    {isPlayerJoined && !isPlayerReady && (
                      <div className="absolute -bottom-1 -right-1 bg-zinc-400 rounded-full p-0.5">
                        <Loader2 className="w-3 h-3 text-zinc-950 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest truncate w-20 text-center ${
                      isPlayerJoined ? 'text-zinc-300' : 'text-zinc-600'
                    }`}>
                      {p.name}
                    </span>
                    <span className="text-[8px] uppercase tracking-tighter text-zinc-500">
                      {isPlayerReady ? 'Listo' : isPlayerJoined ? 'Eligiendo...' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commander Selection (Only if not ready) */}
          {!isReady ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Tus Comandantes</h3>
                <span className="text-[10px] text-zinc-600">{savedCommanders.length} Guardados</span>
              </div>

              {savedCommanders.length === 0 ? (
                <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-8 text-center space-y-4">
                  <Swords className="w-10 h-10 text-zinc-800 mx-auto" />
                  <p className="text-sm text-zinc-500">No tienes comandantes guardados.</p>
                  <button 
                    onClick={handleReady}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all"
                  >
                    Continuar sin Comandante
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSelect(null)}
                    className={`aspect-[2.5/3.5] rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      selectedId === 'none' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-zinc-950/50 hover:border-white/10'
                    }`}
                  >
                    <X className="w-6 h-6 text-zinc-700" />
                    <span className="text-[10px] font-bold uppercase text-zinc-500">Sin Comandante</span>
                  </button>
                  {savedCommanders.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className={`group relative aspect-[2.5/3.5] rounded-xl overflow-hidden border-2 transition-all ${
                        selectedId === c.id ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-white/5 hover:border-white/10'
                      }`}
                    >
                      <img src={c.imageURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[10px] font-bold truncate text-white">{c.name}</p>
                      </div>
                      {selectedId === c.id && (
                        <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1">
                          <Check className="w-3 h-3 text-zinc-950" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleReady}
                disabled={!selectedId}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                Estoy Listo
              </button>
            </div>
          ) : (
            <div className="py-12 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Swords className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Esperando a los demás...</h3>
                <p className="text-zinc-500 text-sm">La partida iniciará automáticamente cuando todos estén listos.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
