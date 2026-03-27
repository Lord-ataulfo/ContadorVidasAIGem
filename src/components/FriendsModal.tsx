import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, UserPlus, Trash2, User, Search, Check, Copy } from 'lucide-react';
import { Friend } from '../types.ts';
import { getFriends, addFriendByCode, removeFriend } from '../services/friendService.ts';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendCode, setFriendCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setLoading(true);
    const data = await getFriends();
    setFriends(data);
    setLoading(false);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      await addFriendByCode(friendCode.trim().toUpperCase());
      setSuccess('Friend added successfully!');
      setFriendCode('');
      loadFriends();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add friend');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      await removeFriend(friendUid);
      loadFriends();
    }
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
            className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Friends</h2>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Ataufo's Life Counter community</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 sm:p-8 border-b border-white/5">
              <form onSubmit={handleAddFriend} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                    placeholder="ENTER FRIEND CODE (e.g. ABC1234)"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all uppercase"
                    maxLength={7}
                  />
                </div>
                <button
                  type="submit"
                  disabled={adding || !friendCode}
                  className="w-full bg-emerald-500 text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Add Friend
                </button>
                {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>}
                {success && <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest text-center">{success}</p>}
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">No friends added yet</p>
                    <p className="text-zinc-500 text-xs">Add friends using their unique code.</p>
                  </div>
                </div>
              ) : (
                friends.map((friend) => (
                  <div 
                    key={friend.friendUid}
                    className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-emerald-500 border border-white/5">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{friend.username}</p>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{friend.userCode}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFriend(friend.friendUid)}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
