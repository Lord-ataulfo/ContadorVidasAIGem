import * as React from 'react';
import { useState, useCallback, useEffect, ErrorInfo, ReactNode } from 'react';
import { Menu, RotateCcw, Home, Trophy, AlertTriangle, RefreshCw, LogOut, LogIn } from 'lucide-react';
import { GameType, Player, GameState, UserProfile } from './types';
import GameSetup from './components/GameSetup.tsx';
import PlayerCard from './components/PlayerCard.tsx';
import CommanderDamageModal from './components/CommanderDamageModal.tsx';
import Timer from './components/Timer.tsx';
import LoginModal from './components/LoginModal.tsx';
import { Navigation } from './components/Navigation.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { FriendsModal } from './components/FriendsModal.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToAuthChanges, getUserProfile, logoutUser } from './services/authService.ts';
import { saveGameRecord } from './services/gameService.ts';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  state: any = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let errorDetail = "";

      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          errorMessage = `Firestore ${parsed.operationType} error`;
          errorDetail = parsed.error;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-rose-500/20 rounded-3xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{errorMessage}</h2>
              <p className="text-zinc-400 text-sm">{errorDetail || "An unexpected error occurred. Please try again or check your connection."}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black font-black py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const PLAYER_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
];

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedPlayerForDamage, setSelectedPlayerForDamage] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      try {
        if (user) {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Automatic Game Saving
  useEffect(() => {
    if (gameState?.isGameOver && userProfile && gameState.startTime) {
      const winner = gameState.winner;
      if (winner) {
        const participantUids = gameState.players
          .map(p => p.uid)
          .filter((uid): uid is string => !!uid);

        const record = {
          gameType: gameState.gameType,
          startTime: gameState.startTime,
          endTime: Date.now(),
          duration: Date.now() - gameState.startTime,
          players: gameState.players.map(p => ({
            name: p.name,
            life: p.life,
            color: p.color,
            isEliminated: p.isEliminated,
            uid: p.uid
          })),
          winnerName: winner.name,
          participantUids
        };
        saveGameRecord(record);
      }
    }
  }, [gameState?.isGameOver, userProfile]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const startGame = (type: GameType, playerConfigs: { name: string; color: string; uid?: string }[]) => {
    const initialLife = type === 'standard' ? 20 : 40;
    const players: Player[] = playerConfigs.map((config, i) => ({
      id: i,
      name: config.name,
      uid: config.uid,
      life: initialLife,
      color: config.color,
      isEliminated: false,
      commanderDamage: {},
      toxicDamage: 0,
    }));

    setGameState({
      gameType: type,
      players,
      startTime: Date.now(),
      isGameOver: false,
      winner: null,
    });
  };

  const checkGameOver = (state: GameState): GameState => {
    const activePlayers = state.players.filter(p => !p.isEliminated);
    
    // If the game was over but now there's more than 1 active player, it's not over anymore
    if (state.isGameOver && activePlayers.length > 1) {
      return {
        ...state,
        isGameOver: false,
        winner: null
      };
    }

    if (activePlayers.length === 1 && state.players.length > 1) {
      return {
        ...state,
        isGameOver: true,
        winner: activePlayers[0]
      };
    }
    if (activePlayers.length === 0 && state.players.length > 0) {
       return {
        ...state,
        isGameOver: true,
        winner: null // Draw?
      };
    }
    return state;
  };

  const handleLifeChange = useCallback((playerId: number, amount: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map(p => {
        if (p.id === playerId) {
          const newLife = p.life + amount;
          // Check all elimination conditions
          const maxCommanderDamage = (Object.values(p.commanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = newLife <= 0 || (p.toxicDamage as number) >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            life: newLife,
            isEliminated
          };
        }
        return p;
      });

      return checkGameOver({ ...prev, players: newPlayers });
    });
  }, []);

  const handleToxicChange = useCallback((playerId: number, amount: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map(p => {
        if (p.id === playerId) {
          const newToxic = Math.max(0, p.toxicDamage + amount);
          const newLife = p.life - amount; // Toxic damage also reduces life
          
          const maxCommanderDamage = (Object.values(p.commanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = newLife <= 0 || newToxic >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            toxicDamage: newToxic,
            life: newLife,
            isEliminated
          };
        }
        return p;
      });

      return checkGameOver({ ...prev, players: newPlayers });
    });
  }, []);

  const handleCommanderDamageChange = useCallback((targetId: number, sourceId: number, amount: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map(p => {
        if (p.id === targetId) {
          const sourceIdStr = sourceId.toString();
          const currentDamage = (p.commanderDamage[sourceIdStr] as number | undefined) || 0;
          const newDamage = Math.max(0, currentDamage + amount);
          const newCommanderDamage = { ...p.commanderDamage, [sourceIdStr]: newDamage };
          
          // Commander damage also reduces life
          const newLife = p.life - amount;
          
          const maxCommanderDamage = (Object.values(newCommanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = newLife <= 0 || (p.toxicDamage as number) >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            life: newLife,
            commanderDamage: newCommanderDamage,
            isEliminated
          };
        }
        return p;
      });

      return checkGameOver({ ...prev, players: newPlayers });
    });
  }, []);

  const resetGame = () => {
    if (!gameState) return;
    const playerConfigs = gameState.players.map(p => ({
      name: p.name,
      color: p.color,
      uid: p.uid
    }));
    startGame(gameState.gameType, playerConfigs);
    setShowMenu(false);
  };

  const exitToHome = () => {
    setGameState(null);
    setShowMenu(false);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-serif italic">Loading ATA...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
          <Navigation 
            userProfile={userProfile}
            onLoginClick={() => setShowLoginModal(true)}
            onLogoutClick={handleLogout}
            onHistoryClick={() => setIsHistoryModalOpen(true)}
            onFriendsClick={() => setIsFriendsModalOpen(true)}
            onHomeClick={exitToHome}
          />
          <main className="lg:pl-20 pt-16 lg:pt-0 min-h-screen">
            <GameSetup 
              onStart={startGame} 
              userProfile={userProfile}
              onLoginClick={() => setShowLoginModal(true)}
              onLogoutClick={handleLogout}
            />
          </main>
          <AnimatePresence>
            {showLoginModal && (
              <LoginModal 
                onClose={() => setShowLoginModal(false)} 
                onSuccess={(profile) => {
                  setUserProfile(profile);
                  setShowLoginModal(false);
                }} 
              />
            )}
          </AnimatePresence>
          <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
          />
          <FriendsModal
            isOpen={isFriendsModalOpen}
            onClose={() => setIsFriendsModalOpen(false)}
          />
        </div>
      </ErrorBoundary>
    );
  }

  const activePlayerForDamage = gameState.players.find(p => p.id === selectedPlayerForDamage);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30">
        <Navigation 
          userProfile={userProfile}
          onLoginClick={() => setShowLoginModal(true)}
          onLogoutClick={handleLogout}
          onHistoryClick={() => setIsHistoryModalOpen(true)}
          onFriendsClick={() => setIsFriendsModalOpen(true)}
          onHomeClick={exitToHome}
        />
        
        <main className="lg:pl-20 pt-16 lg:pt-0 min-h-screen flex flex-col bg-zinc-950 overflow-y-auto select-none relative">
          {/* HUD Overlay */}
          <div className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-center pointer-events-none">
            <div className="pointer-events-auto">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/60 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    key="menu-dropdown"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute top-14 left-4 w-48 bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                  >
                    <button 
                      onClick={resetGame}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Game
                    </button>
                    <button 
                      onClick={exitToHome}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-medium border-t border-white/5"
                    >
                      <Home className="w-4 h-4" />
                      Main Menu
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pointer-events-auto">
              <Timer startTime={gameState.startTime} isPaused={gameState.isGameOver} />
            </div>
          </div>

          {/* Players Grid */}
          <div className={`flex-1 grid gap-0.5 ${
            gameState.players.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 
            gameState.players.length <= 4 ? 'grid-cols-2' : 
            gameState.players.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' : 
            'grid-cols-2 sm:grid-cols-4'
          }`}>
            {gameState.players.map(player => (
              <PlayerCard 
                key={player.id}
                player={player}
                players={gameState.players}
                gameType={gameState.gameType}
                totalPlayers={gameState.players.length}
                onLifeChange={handleLifeChange}
                onToxicChange={handleToxicChange}
                onCommanderDamageClick={setSelectedPlayerForDamage}
              />
            ))}
          </div>

          {/* Modals */}
          <AnimatePresence>
            {activePlayerForDamage && (
              <CommanderDamageModal 
                key="commander-modal"
                targetPlayer={activePlayerForDamage}
                players={gameState.players}
                onClose={() => setSelectedPlayerForDamage(null)}
                onDamageChange={handleCommanderDamageChange}
              />
            )}

            {gameState.isGameOver && (
              <motion.div 
                key="game-over-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
              >
                <motion.div 
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-zinc-900 p-8 rounded-3xl border border-white/10 shadow-2xl text-center max-w-sm w-full space-y-6"
                >
                  <div className="flex justify-center">
                    <div className="p-4 bg-emerald-500/10 rounded-full">
                      <Trophy className="w-12 h-12 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-4xl font-serif font-black tracking-tighter uppercase text-emerald-500">Victory!</h2>
                    <p className="text-zinc-400">
                      {gameState.winner ? `${gameState.winner.name} is the last one standing.` : 'The game has ended.'}
                    </p>
                  </div>

                  <div 
                    className="py-4 rounded-2xl font-serif font-bold text-2xl"
                    style={{ backgroundColor: gameState.winner?.color, color: '#000' }}
                  >
                    {gameState.winner?.name}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={resetGame}
                      className="py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                    >
                      Play Again
                    </button>
                    <button 
                      onClick={exitToHome}
                      className="py-3 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-xl font-bold transition-colors"
                    >
                      Home
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {showLoginModal && (
            <LoginModal 
              onClose={() => setShowLoginModal(false)} 
              onSuccess={(profile) => {
                setUserProfile(profile);
                setShowLoginModal(false);
              }} 
            />
          )}
        </AnimatePresence>
        
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />

        <FriendsModal
          isOpen={isFriendsModalOpen}
          onClose={() => setIsFriendsModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
