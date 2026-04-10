import * as React from 'react';
import { useState, useCallback, useEffect, ErrorInfo, ReactNode, useRef } from 'react';
import { Menu, RotateCcw, Home, Trophy, AlertTriangle, RefreshCw, LogOut, LogIn, Cloud, CloudOff, X } from 'lucide-react';
import { GameType, Player, GameState, UserProfile, CommanderCard } from './types';
import GameSetup from './components/GameSetup.tsx';
import PlayerCard from './components/PlayerCard.tsx';
import CommanderDamageModal from './components/CommanderDamageModal.tsx';
import Timer from './components/Timer.tsx';
import LoginModal from './components/LoginModal.tsx';
import { Navigation } from './components/Navigation.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { FriendsModal } from './components/FriendsModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { CommanderModal } from './components/CommanderModal.tsx';
import { LoginSuggestionModal } from './components/LoginSuggestionModal.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToAuthChanges, getUserProfile, logoutUser } from './services/authService.ts';
import { saveGameRecord, createActiveGame, updateActiveGame, listenToActiveGame, listenForInvites, deleteActiveGame } from './services/gameService.ts';
import { ActiveGame } from './types.ts';

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCommanderModalOpen, setIsCommanderModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showLoginSuggestion, setShowLoginSuggestion] = useState(false);
  const [activeGameError, setActiveGameError] = useState<string | null>(null);
  const [pendingGameConfig, setPendingGameConfig] = useState<{ type: GameType; playerConfigs: { name: string; color: string; uid?: string; userCode?: string; photoURL?: string; commanderCard?: CommanderCard }[] } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<number | null>(null);
  const isProcessingRemoteUpdate = useRef(false);
  const lastServerState = useRef<string | null>(null);

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
          setGameState(null);
          setIsHistoryModalOpen(false);
          setIsFriendsModalOpen(false);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for invites when at home or in a finished game
  useEffect(() => {
    if (isAuthReady && userProfile && (!gameState || gameState.isGameOver)) {
      const unsubscribe = listenForInvites(userProfile.uid, (games) => {
        if (games.length > 0) {
          // Find the most recent active game that isn't the current one
          const game = games.find(g => g.id !== gameState?.id);
          if (!game) return;

          // Check for timeout (2 hours of inactivity)
          const now = Date.now();
          const twoHours = 2 * 60 * 60 * 1000;
          if (now - game.lastLifeChangeTimestamp > twoHours) {
            console.log("Found timed out game, skipping:", game.id);
            return;
          }

          console.log("Invitación recibida, uniéndose a la partida:", game.id);
          
          // Marcamos como actualización remota para evitar subir el estado inicial
          isProcessingRemoteUpdate.current = true;
          
          const normalize = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());
          const initialStateStr = JSON.stringify({
            players: game.players.map(p => JSON.parse(normalize(p))),
            isGameOver: game.isGameOver,
            winner: game.winner ? JSON.parse(normalize(game.winner)) : null
          });
          lastServerState.current = initialStateStr;
          
          setGameState({
            id: game.id,
            gameType: game.gameType,
            players: game.players,
            startTime: game.startTime,
            isGameOver: game.isGameOver,
            winner: game.winner,
            hostUid: game.hostUid,
            lastLifeChangeTimestamp: game.lastLifeChangeTimestamp,
          });
        }
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, userProfile, gameState?.id, gameState?.isGameOver]);

  // Check for game timeout (2 hours of inactivity)
  useEffect(() => {
    if (!gameState || gameState.isGameOver || !gameState.lastLifeChangeTimestamp) return;

    const checkTimeout = () => {
      const now = Date.now();
      const twoHours = 2 * 60 * 60 * 1000;
      if (now - gameState.lastLifeChangeTimestamp > twoHours) {
        console.log("Game timed out due to inactivity");
        setGameState(prev => prev ? { ...prev, isGameOver: true, isTimeout: true } : null);
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [gameState?.id, gameState?.isGameOver, gameState?.lastLifeChangeTimestamp]);

  // Sincronización en tiempo real: Escucha cambios en la partida activa desde Firestore
  useEffect(() => {
    const gameId = gameState?.id;
    if (gameId) {
      console.log("Iniciando escucha de partida activa:", gameId);
      // Suscribirse a los cambios del documento de la partida en Firestore
      const unsubscribe = listenToActiveGame(gameId, (remoteGame) => {
        if (remoteGame) {
          // Check for timeout (2 hours of inactivity)
          const now = Date.now();
          const twoHours = 2 * 60 * 60 * 1000;
          if (now - remoteGame.lastLifeChangeTimestamp > twoHours && !remoteGame.isGameOver) {
            console.log("Active game timed out");
            setGameState(prev => prev ? { ...prev, isGameOver: true, isTimeout: true } : null);
            return;
          }

          // Función para normalizar objetos y comparar sin importar el orden de las claves
          const normalize = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());
          
          const remoteStateStr = JSON.stringify({
            players: remoteGame.players.map(p => JSON.parse(normalize(p))),
            isGameOver: remoteGame.isGameOver,
            winner: remoteGame.winner ? JSON.parse(normalize(remoteGame.winner)) : null
          });

          setGameState(prev => {
            // Si no hay estado previo o el ID no coincide, ignoramos
            if (!prev || prev.id !== gameId) return prev;
            
            const currentStateStr = JSON.stringify({
              players: prev.players.map(p => JSON.parse(normalize(p))),
              isGameOver: prev.isGameOver,
              winner: prev.winner ? JSON.parse(normalize(prev.winner)) : null
            });

            // Si el estado local ya es igual al remoto, no hacemos nada
            if (currentStateStr === remoteStateStr) {
              return prev;
            }

            console.log("Actualización remota recibida y aplicada:", remoteStateStr);
            // Marcamos que esta actualización viene del servidor para que el sync effect no la devuelva
            isProcessingRemoteUpdate.current = true;
            lastServerState.current = remoteStateStr;
            setLastRemoteUpdate(Date.now());
            
            return {
              ...prev,
              players: remoteGame.players,
              isGameOver: remoteGame.isGameOver,
              winner: remoteGame.winner,
              hostUid: remoteGame.hostUid,
              lastLifeChangeTimestamp: remoteGame.lastLifeChangeTimestamp,
            };
          });
        } else if (gameState && !gameState.isGameOver && gameState.id === gameId) {
          // Si el documento desaparece y el juego no ha terminado, volvemos al inicio
          // Pero solo si el ID coincide con el que estamos escuchando
          setGameState(null);
        }
      });
      return () => {
        console.log("Limpiando escucha de partida:", gameId);
        unsubscribe();
      };
    }
  }, [gameState?.id]);

  // Limpiar el indicador de actualización remota después de unos segundos
  useEffect(() => {
    if (lastRemoteUpdate) {
      const timer = setTimeout(() => setLastRemoteUpdate(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastRemoteUpdate]);

  // Sincronización en tiempo real: Sube los cambios locales a Firestore
  useEffect(() => {
    if (!gameState?.id) return;

    // Si este cambio de estado vino de una actualización remota, NO lo sincronizamos de vuelta
    if (isProcessingRemoteUpdate.current) {
      console.log("Omitiendo sincronización: el cambio vino del servidor");
      isProcessingRemoteUpdate.current = false;
      return;
    }

    // Función para normalizar objetos y comparar sin importar el orden de las claves
    const normalize = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());

    const currentStateStr = JSON.stringify({
      players: gameState.players.map(p => JSON.parse(normalize(p))),
      isGameOver: gameState.isGameOver,
      winner: gameState.winner ? JSON.parse(normalize(gameState.winner)) : null
    });

    // Solo subimos a Firestore si el cambio es LOCAL y diferente a lo último que sabemos del servidor
    if (currentStateStr !== lastServerState.current) {
      setIsSyncing(true);
      console.log("Sincronizando cambio local a Firestore:", currentStateStr);
      lastServerState.current = currentStateStr;
      
      updateActiveGame(gameState.id, {
        players: gameState.players,
        isGameOver: gameState.isGameOver,
        winner: gameState.winner
      }).finally(() => {
        setIsSyncing(false);
      });
    }
  }, [gameState]);

  // Automatic Game Saving
  useEffect(() => {
    if (gameState?.isGameOver && userProfile && gameState.startTime && !gameState.hasBeenSaved) {
      // If it's a timeout, we don't save to history
      if (gameState.isTimeout) {
        setGameState(prev => prev ? { ...prev, hasBeenSaved: true } : null);
        return;
      }

      // Only save if it's a local game (no id) OR if the current user is the host
      const isHost = !gameState.id || gameState.hostUid === userProfile.uid;
      
      if (!isHost) return;

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
            uid: p.uid,
            userCode: p.userCode
          })),
          winnerName: winner.name,
          participantUids
        };
        
        // Mark as saved immediately to prevent duplicate calls
        setGameState(prev => prev ? { ...prev, hasBeenSaved: true } : null);
        saveGameRecord(record, gameState.id);
      }
    }
  }, [gameState?.isGameOver, userProfile, gameState?.hasBeenSaved, gameState?.id, gameState?.hostUid]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const startGame = (type: GameType, playerConfigs: { name: string; color: string; uid?: string; userCode?: string; photoURL?: string; commanderCard?: CommanderCard }[]) => {
    if (gameState && !gameState.isGameOver) {
      setActiveGameError("You are already in an active game. Please finish or leave it first.");
      return;
    }
    if (!userProfile) {
      setPendingGameConfig({ type, playerConfigs });
      setShowLoginSuggestion(true);
      return;
    }
    proceedWithGame(type, playerConfigs);
  };

  const proceedWithGame = async (type: GameType, playerConfigs: { name: string; color: string; uid?: string; userCode?: string; photoURL?: string; commanderCard?: CommanderCard }[]) => {
    const initialLife = type === 'standard' ? 20 : 40;
    const players: Player[] = playerConfigs.map((config, i) => ({
      id: i,
      name: config.name,
      uid: config.uid,
      userCode: config.userCode,
      life: initialLife,
      color: config.color,
      photoURL: config.photoURL,
      commanderCard: config.commanderCard,
      isEliminated: false,
      commanderDamage: {},
      poisonDamage: 0,
    }));

    const participantUids = players.map(p => p.uid).filter(Boolean) as string[];
    const isMultiplayer = participantUids.length > 1;
    const gameId = isMultiplayer ? `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined;

    const newGameState: GameState = {
      id: gameId,
      gameType: type,
      players,
      startTime: Date.now(),
      isGameOver: false,
      winner: null,
      hostUid: userProfile.uid,
      lastLifeChangeTimestamp: Date.now(),
    };

    if (gameId) {
      const activeGame: ActiveGame = {
        id: gameId,
        gameType: type,
        startTime: newGameState.startTime!,
        isGameOver: false,
        players,
        winner: null,
        hostUid: userProfile.uid,
        participantUids,
        lastUpdated: Date.now(),
        lastLifeChangeTimestamp: Date.now(),
      };
      
      // Inicializar el estado del servidor ANTES de crear la partida y setear el estado
      const normalize = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());
      const initialStateStr = JSON.stringify({
        players: players.map(p => JSON.parse(normalize(p))),
        isGameOver: false,
        winner: null
      });
      
      lastServerState.current = initialStateStr;
      isProcessingRemoteUpdate.current = false;
      
      await createActiveGame(activeGame);
    }

    setGameState(newGameState);
    setShowLoginSuggestion(false);
    setPendingGameConfig(null);
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
          const maxCommanderDamage = (Object.values(p.commanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = newLife <= 0 || (p.poisonDamage as number) >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            life: newLife,
            isEliminated
          };
        }
        return p;
      });

      const newState = checkGameOver({ 
        ...prev, 
        players: newPlayers,
        lastLifeChangeTimestamp: Date.now()
      });
      return newState;
    });
  }, []);

  const handlePoisonChange = useCallback((playerId: number, amount: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map(p => {
        if (p.id === playerId) {
          const newPoison = Math.max(0, p.poisonDamage + amount);
          const maxCommanderDamage = (Object.values(p.commanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = p.life <= 0 || newPoison >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            poisonDamage: newPoison,
            isEliminated
          };
        }
        return p;
      });

      const newState = checkGameOver({ 
        ...prev, 
        players: newPlayers,
        lastLifeChangeTimestamp: Date.now()
      });

      return newState;
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
          const newLife = p.life - amount;
          const maxCommanderDamage = (Object.values(newCommanderDamage) as number[]).reduce((max, val) => Math.max(max, val), 0);
          const isEliminated = newLife <= 0 || (p.poisonDamage as number) >= 11 || maxCommanderDamage >= 21;
          
          return { 
            ...p, 
            life: newLife,
            commanderDamage: newCommanderDamage,
            isEliminated
          };
        }
        return p;
      });

      const newState = checkGameOver({ 
        ...prev, 
        players: newPlayers,
        lastLifeChangeTimestamp: Date.now()
      });

      return newState;
    });
  }, []);

  const handleLeaveGame = () => {
    if (!gameState || !userProfile) return;
    
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map(p => {
        if (p.uid === userProfile.uid) {
          return { ...p, isEliminated: true, life: 0 };
        }
        return p;
      });
      return checkGameOver({ ...prev, players: newPlayers, lastLifeChangeTimestamp: Date.now() });
    });
    
    // If it's a multiplayer game, we stay in the game state but as eliminated
    // unless the game is over. If the user wants to go home, they use exitToHome.
  };

  const resetGame = () => {
    if (!gameState) return;
    const playerConfigs = gameState.players.map(p => ({
      name: p.name,
      color: p.color,
      uid: p.uid,
      userCode: p.userCode
    }));
    startGame(gameState.gameType, playerConfigs);
    setShowMenu(false);
  };

  const exitToHome = () => {
    if (gameState?.id) {
      deleteActiveGame(gameState.id);
    }
    setGameState(null);
    setShowMenu(false);
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-serif italic">Loading Kirocos...</p>
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
            onProfileClick={() => setIsProfileModalOpen(true)}
            onCommanderClick={() => setIsCommanderModalOpen(true)}
            onHomeClick={exitToHome}
          />
          <main className="lg:pl-20 pt-16 lg:pt-0 min-h-screen bg-transparent">
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
                  if (pendingGameConfig) {
                    proceedWithGame(pendingGameConfig.type, pendingGameConfig.playerConfigs);
                  }
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
          <AnimatePresence>
            {isCommanderModalOpen && userProfile && (
              <CommanderModal 
                isOpen={isCommanderModalOpen}
                uid={userProfile.uid}
                onClose={() => setIsCommanderModalOpen(false)}
                onUpdate={(updatedCard) => setUserProfile(prev => prev ? { ...prev, commanderCard: updatedCard || undefined } : null)}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isProfileModalOpen && userProfile && (
              <ProfileModal 
                userProfile={userProfile} 
                onClose={() => setIsProfileModalOpen(false)}
                onUpdate={(updated) => setUserProfile(updated)}
              />
            )}
          </AnimatePresence>
          <LoginSuggestionModal
            isOpen={showLoginSuggestion}
            onClose={() => setShowLoginSuggestion(false)}
            onLogin={() => {
              setShowLoginSuggestion(false);
              setShowLoginModal(true);
            }}
            onContinue={() => {
              if (pendingGameConfig) {
                proceedWithGame(pendingGameConfig.type, pendingGameConfig.playerConfigs);
              }
            }}
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
          onProfileClick={() => setIsProfileModalOpen(true)}
          onCommanderClick={() => setIsCommanderModalOpen(true)}
          onHomeClick={exitToHome}
          isInGame={!!gameState && !gameState.isGameOver}
          onLeaveGame={handleLeaveGame}
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

          {/* Sync Status Indicator */}
          {gameState.id && (
            <div className="flex justify-end mb-2 px-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-[10px] uppercase tracking-wider font-mono">
                {isSyncing ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Syncing...</span>
                  </>
                ) : lastRemoteUpdate ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                    <span className="text-amber-500">Remote Update</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    <Cloud className="w-3 h-3 text-zinc-600" />
                    <span className="text-zinc-600">Synced</span>
                  </>
                )}
              </div>
            </div>
          )}

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
                onPoisonChange={handlePoisonChange}
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
          {activeGameError && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl flex items-center gap-3"
            >
              <X className="w-5 h-5 cursor-pointer" onClick={() => setActiveGameError(null)} />
              <span>{activeGameError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLoginModal && (
            <LoginModal 
              onClose={() => setShowLoginModal(false)} 
              onSuccess={(profile) => {
                setUserProfile(profile);
                setShowLoginModal(false);
                if (pendingGameConfig) {
                  proceedWithGame(pendingGameConfig.type, pendingGameConfig.playerConfigs);
                }
              }} 
            />
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isProfileModalOpen && userProfile && (
            <ProfileModal 
              userProfile={userProfile} 
              onClose={() => setIsProfileModalOpen(false)}
              onUpdate={(updated) => setUserProfile(updated)}
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
