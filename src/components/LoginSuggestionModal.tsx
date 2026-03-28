import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Play, X, History, Trophy } from 'lucide-react';

interface LoginSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onContinue: () => void;
}

export const LoginSuggestionModal: React.FC<LoginSuggestionModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onContinue,
}) => {
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
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                  <History className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Track Your Battles?</h2>
                <p className="text-zinc-400 text-sm">
                  Log in or register to save your game history, track your wins, and connect with friends for a better experience.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4">
                <button
                  onClick={onLogin}
                  className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  LOG IN / REGISTER
                </button>
                
                <button
                  onClick={onContinue}
                  className="w-full py-4 bg-white/5 text-zinc-400 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  CONTINUE WITHOUT LOGGING IN
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
