import React, { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';
import { Navbar, NavTab } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { PlayPage } from './pages/PlayPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { GameSettings, GameRecord, UserProfile } from './types/chess';
import { sounds } from './utils/sound';
import { getValidAvatar } from './utils/avatar';

const SETTINGS_KEY = 'vicky_chess_settings_v1';
const USER_PROFILE_KEY = 'vicky_chess_player_v1';
const AUTH_KEY = 'vicky_chess_is_authenticated_v1';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [targetReplayUser, setTargetReplayUser] = useState<string | null>(null);
  const [targetReplayGameId, setTargetReplayGameId] = useState<string | number | null>(null);
  const [guestView, setGuestView] = useState<'login' | 'leaderboard'>('login');

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.registeredAt !== 'Original Dataset') {
          return {
            ...parsed,
            avatar: getValidAvatar(parsed.avatar),
          };
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const isAuth = localStorage.getItem(AUTH_KEY) === 'true';
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      if (isAuth && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name && parsed.registeredAt !== 'Original Dataset') {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      personalizationWeight: 0.65,
      stockfishDepth: 14,
      difficulty: 'master',
      boardTheme: 'green',
      soundEnabled: true,
      autoFlip: false,
      playerColor: 'w',
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      sounds.setEnabled(settings.soundEnabled);
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(USER_PROFILE_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleToggleSound = () => {
    const next = !settings.soundEnabled;
    sounds.setEnabled(next);
    handleUpdateSettings({ soundEnabled: next });
  };

  const handleLoginUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem(AUTH_KEY, 'true');
  };

  const handleEnterDashboard = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem(AUTH_KEY, 'true');
    setCurrentTab('home');
  };

  const handlePlayWithUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem(AUTH_KEY, 'true');
    setCurrentTab('play');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
  };

  const handleReplayPlayer = (username: string) => {
    setTargetReplayUser(username);
    setTargetReplayGameId(null);
    setCurrentTab('history');
  };

  const handleReviewMatch = (gameId?: string | number) => {
    if (gameId) setTargetReplayGameId(gameId);
    if (currentUser) setTargetReplayUser(currentUser.username || currentUser.name);
    setCurrentTab('history');
  };

  // 1. Initial Gate: Login / Registration Screen First
  if (!isLoggedIn) {
    if (guestView === 'leaderboard') {
      return (
        <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans selection:bg-[#81b64c] selection:text-white">
          <header className="border-b border-[#2b2b30] bg-[#141416]/95 backdrop-blur px-6 py-4 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-green-900/30">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-base tracking-tight text-white">VICKY AI CHESS</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                      LEADERBOARD
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block -mt-0.5 font-medium">
                    Official Global Challenger Standings
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuestView('login')}
                className="px-5 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Sign In / Register
              </button>
            </div>
          </header>

          <main className="flex-1 pb-16">
            <LeaderboardPage
              currentUser={null}
              onStartGame={() => setGuestView('login')}
              onNavigateLogin={() => setGuestView('login')}
            />
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans selection:bg-[#81b64c] selection:text-white">
        {/* Minimal Login Header */}
        <header className="border-b border-[#2b2b30] bg-[#141416]/95 backdrop-blur px-6 py-4 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-green-900/30">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">VICKY AI CHESS</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/50">
                    MASTER AI
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 block -mt-0.5 font-medium">
                  Register Your Name & Enter Dashboard
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setGuestView('leaderboard')}
                className="px-3.5 py-2 rounded-xl bg-[#202026] hover:bg-[#2c2c34] text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer hidden sm:flex items-center space-x-1.5"
              >
                <span>🏆 Leaderboard</span>
              </button>
              <div className="text-xs text-gray-400 hidden md:flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Stockfish 18 Engine Ready</span>
              </div>
            </div>
          </div>
        </header>

        {/* First Page: Registration & Login Screen */}
        <main className="flex-1 flex items-center justify-center py-8">
          <LoginPage
            currentUser={currentUser}
            onLogin={handleLoginUser}
            onEnterDashboard={handleEnterDashboard}
            onPlay={handlePlayWithUser}
            onViewLeaderboard={() => setGuestView('leaderboard')}
          />
        </main>
      </div>
    );
  }

  // 2. Main Dashboard & Playing Experience
  return (
    <div className="min-h-screen bg-[#121212] text-gray-100 flex flex-col font-sans selection:bg-[#81b64c] selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        soundEnabled={settings.soundEnabled}
        onToggleSound={handleToggleSound}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {currentTab === 'home' && (
          <HomePage
            onStartGame={() => setCurrentTab('play')}
            onNavigate={(tab) => setCurrentTab(tab)}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'play' && (
          <PlayPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            currentUser={currentUser}
            onBack={() => setCurrentTab('home')}
            onNavigateHistory={handleReviewMatch}
          />
        )}

        {currentTab === 'history' && (
          <HistoryPage
            onStartGame={() => setCurrentTab('play')}
            currentUser={currentUser}
            targetUsername={targetReplayUser}
            targetGameId={targetReplayGameId}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardPage
            currentUser={currentUser}
            onStartGame={() => setCurrentTab('play')}
            onNavigateLogin={() => setCurrentTab('login')}
            onReplayPlayer={handleReplayPlayer}
          />
        )}

        {currentTab === 'stats' && <StatisticsPage />}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {currentTab === 'login' && (
          <LoginPage
            currentUser={currentUser}
            onLogin={handleLoginUser}
            onEnterDashboard={handleEnterDashboard}
            onPlay={handlePlayWithUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222226] bg-[#141416] py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-gray-300">VICKY AI CHESS</span>
            <span>•</span>
            <span>Master AI Opponent</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>
              Player: {currentUser ? `${currentUser.name.toUpperCase()} (${currentUser.rating} Elo)` : 'CHALLENGER'}
            </span>
            <span>•</span>
            <span>Opponent: VICKY AI (Master)</span>
            <span>•</span>
            <span className="text-[#81b64c]">10+0 Rapid</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
