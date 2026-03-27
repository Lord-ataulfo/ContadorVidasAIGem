import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, History, Users, LogOut, LogIn, Home, 
  ChevronRight, User as UserIcon 
} from 'lucide-react';
import { UserProfile } from '../types.ts';

interface NavigationProps {
  userProfile: UserProfile | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onHistoryClick: () => void;
  onFriendsClick: () => void;
  onHomeClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  userProfile,
  onLoginClick,
  onLogoutClick,
  onHistoryClick,
  onFriendsClick,
  onHomeClick
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, onClick: onHomeClick, show: true },
    { id: 'history', label: 'History', icon: History, onClick: onHistoryClick, show: !!userProfile },
    { id: 'friends', label: 'Friends', icon: Users, onClick: onFriendsClick, show: !!userProfile },
  ];

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-40">
        <h1 className="text-xl font-serif font-bold text-emerald-500">ATA</h1>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 hover:w-64 bg-zinc-950 border-r border-white/5 flex-col items-center py-8 transition-all duration-300 group z-40">
        <div className="mb-12">
          <h1 className="text-2xl font-serif font-bold text-emerald-500 group-hover:hidden">A</h1>
          <h1 className="text-2xl font-serif font-bold text-emerald-500 hidden group-hover:block px-6">ATA Life</h1>
        </div>

        <nav className="flex-1 w-full space-y-2 px-3">
          {menuItems.filter(item => item.show).map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all group/item"
            >
              <item.icon className="w-6 h-6 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="w-full px-3 mt-auto">
          {userProfile ? (
            <button
              onClick={onLogoutClick}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Logout
              </span>
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="w-full flex items-center gap-4 p-3 rounded-xl text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
            >
              <LogIn className="w-6 h-6 shrink-0" />
              <span className="font-bold uppercase tracking-wider text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Log In
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-950 border-l border-white/10 z-50 lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h2 className="text-xl font-serif font-bold text-emerald-500">Menu</h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-4">
                {userProfile && (
                  <div className="bg-zinc-900 rounded-2xl p-4 mb-6 border border-white/5">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-tight">{userProfile.username}</p>
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{userProfile.userCode}</p>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="space-y-2">
                  {menuItems.filter(item => item.show).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.onClick)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 text-zinc-300 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wider text-sm">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6 border-t border-white/5">
                {userProfile ? (
                  <button
                    onClick={() => handleItemClick(onLogoutClick)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-wider text-sm">Logout</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleItemClick(onLoginClick)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-wider text-sm">Log In</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
