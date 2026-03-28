import React, { useState, useEffect } from 'react';
import { Play, Users, Swords, LogIn, LogOut, User, Share2, Copy, Check, UserPlus, Search, Loader2 } from 'lucide-react';
import { GameType, UserProfile } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { getUserByCode } from '../services/authService.ts';

interface GameSetupProps {
  onStart: (type: GameType, players: { name: string; color: string; uid?: string }[]) => void;
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
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

export default function GameSetup({ onStart, userProfile, onLoginClick, onLogoutClick }: GameSetupProps) {
  const [gameType, setGameType] = useState<GameType>('standard');
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [playerUids, setPlayerUids] = useState<(string | undefined)[]>(Array(8).fill(undefined));
  const [errors, setErrors] = useState<(string | null)[]>(Array(8).fill(null));
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const prevUserRef = React.useRef(userProfile);

  useEffect(() => {
    // If logging in, set the first player name
    if (userProfile && !prevUserRef.current) {
      const newNames = [...playerNames];
      const newUids = [...playerUids];
      newNames[0] = userProfile.username;
      newUids[0] = userProfile.uid;
      setPlayerNames(newNames);
      setPlayerUids(newUids);
    } 
    // If logging out, clear the inputs
    else if (!userProfile && prevUserRef.current) {
      setPlayerNames(['', '', '', '', '', '', '', '']);
      setPlayerUids(Array(8).fill(undefined));
      setErrors(Array(8).fill(null));
      setPlayerCount(2);
      setGameType('standard');
    }
    prevUserRef.current = userProfile;
  }, [userProfile]);

  const handleResolveCode = async (index: number) => {
    const name = playerNames[index].trim();
    if (!name.startsWith('#')) return;

    setSearchingIndex(index);
    const newErrors = [...errors];
    newErrors[index] = null;
    setErrors(newErrors);

    try {
      const profile = await getUserByCode(name);
      if (profile) {
        const newNames = [...playerNames];
        const newUids = [...playerUids];
        newNames[index] = profile.username;
        newUids[index] = profile.uid;
        setPlayerNames(newNames);
        setPlayerUids(newUids);
      } else {
        const updatedErrors = [...errors];
        updatedErrors[index] = "User not found";
        setErrors(updatedErrors);
      }
    } catch (err) {
      console.error('Error resolving code:', err);
      const updatedErrors = [...errors];
      updatedErrors[index] = "Error resolving code";
      setErrors(updatedErrors);
    } finally {
      setSearchingIndex(null);
    }
  };

  const copyUserCode = () => {
    if (userProfile?.userCode) {
      navigator.clipboard.writeText(userProfile.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUserCode = async () => {
    if (userProfile?.userCode && navigator.share) {
      try {
        await navigator.share({
          title: "My Ataufo's Life Counter Code",
          text: `Join me on Ataufo's Life Counter! My user code is: ${userProfile.userCode}`,
          url: window.location.href,
        });
      } catch (err: any) {
        // Ignore AbortError (user cancelled the share)
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  useEffect(() => {
    if (gameType === 'standard') {
      setPlayerCount(2);
    }
  }, [gameType]);

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
    
    // Clear error when typing
    if (errors[index]) {
      const newErrors = [...errors];
      newErrors[index] = null;
      setErrors(newErrors);
    }

    // Clear UID if name is changed and it's not the resolved username
    if (playerUids[index] && name !== playerNames[index]) {
      const newUids = [...playerUids];
      newUids[index] = undefined;
      setPlayerUids(newUids);
    }
  };

  const handleStart = async () => {
    setSearchingIndex(-1); // Global loading state
    const finalNames = [...playerNames];
    const finalUids = [...playerUids];
    const newErrors = [...errors];
    let hasError = false;

    for (let i = 0; i < playerCount; i++) {
      const name = finalNames[i].trim();
      if (name.startsWith('#') && !finalUids[i]) {
        try {
          const profile = await getUserByCode(name);
          if (profile) {
            finalNames[i] = profile.username;
            finalUids[i] = profile.uid;
            newErrors[i] = null;
          } else {
            newErrors[i] = "User not found";
            hasError = true;
          }
        } catch (err) {
          console.error(`Error resolving code for player ${i + 1}:`, err);
          newErrors[i] = "Error resolving code";
          hasError = true;
        }
      }
    }

    if (hasError) {
      setErrors(newErrors);
      setSearchingIndex(null);
      return;
    }

    const players = Array.from({ length: playerCount }, (_, i) => ({
      name: finalNames[i].trim() || `Player ${i + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      uid: finalUids[i],
    }));
    
    setSearchingIndex(null);
    onStart(gameType, players);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 text-white overflow-y-auto overflow-x-hidden">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1590424753858-3c6a17638f6c?auto=format&fit=crop&q=80&w=1920" 
          alt="Epic Wolf"
          className="w-full h-full object-cover opacity-80 scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/10 to-zinc-950" />
        <div className="absolute inset-0 bg-zinc-950/5" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md my-8"
      >
        <div className="bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl font-serif font-bold tracking-tighter sm:text-5xl text-emerald-500 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]">ATA Life Counter</h1>
              <p className="text-zinc-300 text-sm">Select your game format and prepare for battle.</p>
            </div>

          {userProfile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2"
            >
              <div className="flex items-center gap-2 text-emerald-500">
                <User className="w-4 h-4" />
                <span className="text-lg font-black uppercase tracking-tight">{userProfile.username}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Code:</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">{userProfile.userCode}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={copyUserCode}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400"
                    title="Copy Code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={shareUserCode}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400"
                    title="Share Code"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setGameType('standard')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
              gameType === 'standard' 
                ? 'bg-emerald-500 text-zinc-950 border-emerald-500' 
                : 'bg-zinc-950/40 border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            <Swords className="w-8 h-8 mb-2" />
            <span className="font-bold">Standard</span>
            <span className="text-xs opacity-70">20 Life</span>
          </button>
          <button
            onClick={() => setGameType('commander')}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
              gameType === 'commander' 
                ? 'bg-emerald-500 text-zinc-950 border-emerald-500' 
                : 'bg-zinc-950/40 border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            <Users className="w-8 h-8 mb-2" />
            <span className="font-bold">Commander</span>
            <span className="text-xs opacity-70">40 Life</span>
          </button>
        </div>

        <div className="space-y-6">
          {gameType === 'commander' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <label className="block text-sm font-medium text-zinc-300 text-center">
                Number of Players: {playerCount}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-100"
              />
              <div className="flex justify-between text-xs text-zinc-500 px-1">
                <span>2</span>
                <span>4</span>
                <span>6</span>
                <span>8</span>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Player Names (Type #CODE to invite)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                  />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder={i === 0 ? "Your Name" : `Player ${i + 1} or #CODE`}
                      value={playerNames[i]}
                      onChange={(e) => handleNameChange(i, e.target.value)}
                      className={`w-full bg-zinc-950 border rounded-xl px-4 py-2 text-sm focus:outline-none transition-colors pr-10 ${
                        errors[i] ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'
                      }`}
                    />
                    {errors[i] && (
                      <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold uppercase tracking-wider">
                        {errors[i]}
                      </p>
                    )}
                    {playerNames[i].startsWith('#') && (
                      <button
                        onClick={() => handleResolveCode(i)}
                        disabled={searchingIndex === i}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors text-emerald-500 disabled:opacity-50"
                        title="Resolve User Code"
                      >
                        {searchingIndex === i ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {playerUids[i] && !playerNames[i].startsWith('#') && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <User className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={searchingIndex !== null}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 uppercase tracking-widest"
        >
          {searchingIndex === -1 ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
          {searchingIndex === -1 ? 'Resolving...' : 'Start Battle'}
        </button>
      </div>
    </motion.div>
    </div>
  );
}
