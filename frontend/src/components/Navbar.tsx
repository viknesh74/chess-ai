import React, { useState } from 'react';
import {
  Gamepad2,
  History,
  BarChart2,
  Settings,
  Volume2,
  VolumeX,
  Menu,
  X,
  Home,
  Flame,
  User,
  LogOut,
  Trophy,
} from 'lucide-react';
import { UserProfile } from '../types/chess';
import { getValidAvatar } from '../utils/avatar';

export type NavTab =
  | 'home'
  | 'play'
  | 'history'
  | 'leaderboard'
  | 'stats'
  | 'settings'
  | 'login';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  soundEnabled,
  onToggleSound,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'play', label: 'Play Vicky', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'history', label: 'Live History', icon: <History className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'stats', label: 'Statistics', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-[#141416]/95 backdrop-blur border-b border-[#2b2b30] px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => handleSelectTab('home')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-[#81b64c] transition-colors">
              VICKY
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/50">
              MASTER AI
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-[#1a1a1d] p-1.5 rounded-xl border border-[#2c2c32]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                currentTab === item.id
                  ? 'bg-[#81b64c] text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#25252a]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* User Profile Pill & Logout */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleSelectTab('login')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                currentTab === 'login'
                  ? 'bg-[#81b64c]/20 border-[#81b64c] text-white shadow-sm'
                  : 'bg-[#222226] hover:bg-[#2c2c32] border-[#333] text-gray-200'
              }`}
              title="Player Profile / Switch User"
            >
              <span className="text-base leading-none">{getValidAvatar(currentUser?.avatar)}</span>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold leading-tight text-white group-hover:text-[#81b64c]">
                  {currentUser?.name || 'Register'}
                </div>
                <div className="text-[10px] text-gray-400 font-mono leading-tight">
                  {currentUser?.rating || 1500} Elo
                </div>
              </div>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-[#222226] hover:bg-red-950/40 hover:text-red-400 border border-[#333] hover:border-red-800/40 text-gray-400 transition-colors"
                title="Switch Player / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-[#222226] hover:bg-[#2c2c32] text-gray-300 border border-[#333] transition-colors"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#81b64c]" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Quick Play Action Button */}
          {currentTab !== 'play' && (
            <button
              onClick={() => handleSelectTab('play')}
              className="hidden sm:flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#81b64c] hover:bg-[#95c65d] text-white shadow-md transition-all transform hover:scale-105"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Play 10+0</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#222226] text-gray-300 hover:bg-[#2c2c32] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden pt-3 pb-2 border-t border-[#2b2b30] mt-3 space-y-1 animate-fade-in">
          {/* Mobile User Profile Button */}
          <button
            onClick={() => handleSelectTab('login')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              currentTab === 'login'
                ? 'bg-[#81b64c] text-white font-bold'
                : 'text-gray-300 hover:bg-[#222226]'
            }`}
          >
            <span className="text-lg">{getValidAvatar(currentUser?.avatar)}</span>
            <span>
              {currentUser?.name || 'Register Player'} ({currentUser?.rating || 1500} Elo)
            </span>
          </button>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                currentTab === item.id
                  ? 'bg-[#81b64c] text-white font-bold'
                  : 'text-gray-300 hover:bg-[#222226]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};
