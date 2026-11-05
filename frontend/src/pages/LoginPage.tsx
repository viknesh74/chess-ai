import React, { useState } from 'react';
import {
  User,
  CheckCircle,
  ArrowRight,
  Flame,
  Sparkles,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Trophy,
} from 'lucide-react';
import { UserProfile } from '../types/chess';
import { sounds } from '../utils/sound';
import { dbRegisterUser, dbLoginUser } from '../utils/dbApi';
import { getValidAvatar } from '../utils/avatar';

interface LoginPageProps {
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onEnterDashboard: (user: UserProfile) => void;
  onPlay: (user: UserProfile) => void;
  onViewLeaderboard?: () => void;
}

const USER_PROFILE_KEY = 'vicky_chess_player_v1';

const AVATAR_OPTIONS = [
  { emoji: '🦁', label: 'Lion', desc: 'Aggressive Attacker' },
  { emoji: '⚡', label: 'Blitz', desc: 'Speed & Tactics' },
  { emoji: '👑', label: 'Crown', desc: 'Grandmaster Spirit' },
  { emoji: '♟️', label: 'Pawn', desc: 'Positional Grinder' },
  { emoji: '🦅', label: 'Eagle', desc: 'Sharp Vision' },
  { emoji: '🐉', label: 'Dragon', desc: 'Sicilian Master' },
  { emoji: '⚔️', label: 'Gladiator', desc: 'Fierce Combat' },
  { emoji: '🧠', label: 'Mastermind', desc: 'Calculated Moves' },
];

const SKILL_LEVELS = [
  { level: 'Beginner', elo: 800, badge: '🟢', desc: 'Learning tactics & fundamentals' },
  { level: 'Intermediate', elo: 1200, badge: '🔵', desc: 'Familiar with openings & endgames' },
  { level: 'Advanced', elo: 1600, badge: '🟣', desc: 'Active club player with tactical depth' },
  { level: 'Master', elo: 2000, badge: '🔴', desc: 'Tournament competitor' },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  onLogin,
  onEnterDashboard,
  onPlay,
  onViewLeaderboard,
}) => {
  // Local profile strictly for THIS browser/device
  const [deviceSavedProfile, setDeviceSavedProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Default tab: if user has a profile saved on this device, show signin, else register
  const [activeTab, setActiveTab] = useState<'register' | 'signin'>(() => {
    try {
      const saved = localStorage.getItem(USER_PROFILE_KEY);
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        if (parsed && parsed.username) return 'signin';
      }
    } catch {
      // ignore
    }
    return 'register';
  });

  // Form State for creating profile
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [rating, setRating] = useState(1200);
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [selectedSkill, setSelectedSkill] = useState('Intermediate');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign in form state
  const [signInNameInput, setSignInNameInput] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSkillSelect = (skill: (typeof SKILL_LEVELS)[0]) => {
    setSelectedSkill(skill.level);
    setRating(skill.elo);
  };

  // Register and proceed directly to Game & Dashboard
  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).');
      return;
    }

    const trimmedUsername = (username.trim() || trimmedName.toLowerCase().replace(/\s+/g, '_')).trim().toLowerCase();

    setIsSubmitting(true);
    setErrorMessage(null);

    const newUser: UserProfile = {
      name: trimmedName,
      username: trimmedUsername,
      rating,
      avatar: selectedAvatar,
      title: `${selectedSkill} Challenger`,
      registeredAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    try {
      // Save locally to this specific device
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newUser));
      setDeviceSavedProfile(newUser);

      // Register in MongoDB Atlas cloud database
      const dbResult = await dbRegisterUser({
        name: newUser.name,
        username: newUser.username,
        rating: newUser.rating,
        avatar: newUser.avatar,
        title: newUser.title,
      });

      const finalUser = dbResult || newUser;
      sounds.playMove();
      onLogin(finalUser);
      onEnterDashboard(finalUser);
    } catch (err: any) {
      console.warn('Registration notice:', err);
      // Even if network has a glitch, log in locally with this account
      sounds.playMove();
      onLogin(newUser);
      onEnterDashboard(newUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign in by verifying correct username in MongoDB Atlas
  const handleSignInByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = signInNameInput.trim().toLowerCase();
    if (!query) {
      setSignInError('Please enter your registered username.');
      return;
    }

    setIsLoggingIn(true);
    setSignInError(null);

    try {
      // Check MongoDB cloud backend
      const matched = await dbLoginUser(query);

      if (matched) {
        sounds.playMove();
        // Save as current device profile
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(matched));
        setDeviceSavedProfile(matched);
        onLogin(matched);
        onEnterDashboard(matched);
      } else {
        setSignInError(`Account not found for username "${signInNameInput.trim()}". Please enter your registered username or create a new profile.`);
      }
    } catch (err) {
      setSignInError('Unable to connect to database. Please check your internet connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-4xl w-full mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>VICKY AI CHESS CHALLENGER PORTAL</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Play Chess With <span className="text-[#81b64c]">VICKY AI</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          Create your personalized account to challenge Vicky Master AI, record your matches in real-time, and climb the official global leaderboard.
        </p>

        {onViewLeaderboard && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onViewLeaderboard}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#202026] hover:bg-[#2b2b34] text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>View Official Leaderboard Standings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* If a profile is currently active */}
      {currentUser && (
        <div className="bg-gradient-to-r from-[#1c1c20] via-[#24242a] to-[#1a1a1e] border border-[#33333a] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-3xl shadow-lg shadow-green-950/40">
              {getValidAvatar(currentUser.avatar)}
            </div>
            <div className="text-left">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  Signed In Profile
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <span>{currentUser.name}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#161618] text-amber-300 border border-amber-600/40">
                  {currentUser.rating} Elo
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                @{currentUser.username} • {currentUser.title || 'Challenger'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEnterDashboard(currentUser)}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-xs shadow-lg shadow-green-950/40 transition-transform transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
            <button
              onClick={() => onPlay(currentUser)}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#27272a] hover:bg-[#333] border border-[#3e3e44] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>Play Vicky</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs: Create Profile vs Sign In */}
      <div className="flex items-center justify-center space-x-2 border-b border-[#2c2c32] pb-2">
        <button
          onClick={() => {
            setActiveTab('register');
            setErrorMessage(null);
          }}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'register'
              ? 'bg-[#81b64c] text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-[#222226]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('signin');
            setSignInError(null);
          }}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'signin'
              ? 'bg-[#81b64c] text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-[#222226]'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      </div>

      {/* TAB 1: CREATE NEW PROFILE */}
      {activeTab === 'register' && (
        <form
          onSubmit={handleRegisterProfile}
          className="bg-[#1c1c20] border border-[#2e2e34] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="border-b border-[#2d2d34] pb-4">
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-[#81b64c]" />
              <span>Register Your Account</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Create your personal profile. Your stats and matches will be securely linked to your unique username.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-semibold animate-shake">
              {errorMessage}
            </div>
          )}

          {/* Name & Username Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Your Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Enter your name (e.g. Alex, Rahul, David)"
                className="w-full px-4 py-3 rounded-xl bg-[#26262c] border border-[#3b3b44] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#81b64c] transition-colors"
                required
                autoFocus
              />
              <span className="text-[11px] text-gray-500 block">
                This name will appear on the clock and match records.
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Username (Unique Account ID) *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_chess or challenger01"
                className="w-full px-4 py-3 rounded-xl bg-[#26262c] border border-[#3b3b44] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#81b64c] transition-colors"
              />
              <span className="text-[11px] text-gray-500 block">
                Used to log into your account. Auto-generated from name if blank.
              </span>
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              Select Your Avatar
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(av.emoji)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center space-y-1 cursor-pointer ${
                    selectedAvatar === av.emoji
                      ? 'bg-[#81b64c]/20 border-[#81b64c] shadow-lg scale-105'
                      : 'bg-[#25252b] border-[#36363e] hover:border-gray-500'
                  }`}
                >
                  <span className="text-2xl">{av.emoji}</span>
                  <span className="text-[10px] font-bold text-gray-300">{av.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Skill Level & Elo Rating */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              Select Your Skill Level & Starting Elo
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {SKILL_LEVELS.map((skill) => (
                <div
                  key={skill.level}
                  onClick={() => handleSkillSelect(skill)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                    selectedSkill === skill.level
                      ? 'bg-[#81b64c]/20 border-[#81b64c] shadow-md'
                      : 'bg-[#25252b] border-[#36363e] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>{skill.badge}</span>
                      <span>{skill.level}</span>
                    </span>
                    <span className="text-xs font-mono font-extrabold text-[#81b64c]">
                      {skill.elo}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">
                    {skill.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-green-950/40 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <UserPlus className="w-5 h-5" />
              <span>{isSubmitting ? 'Creating Account...' : 'Register Profile & Start Playing'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SIGN IN WITH USERNAME */}
      {activeTab === 'signin' && (
        <div className="bg-[#1c1c20] border border-[#2e2e34] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-[#2d2d34] pb-4">
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <LogIn className="w-5 h-5 text-[#81b64c]" />
              <span>Sign In to Your Account</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Enter your registered username below to access your personal dashboard and games.
            </p>
          </div>

          {/* Remembered Account on THIS device */}
          {deviceSavedProfile && (
            <div className="p-4 rounded-2xl bg-[#232329] border border-[#353540] flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#2c2c34] border border-[#3e3e48] flex items-center justify-center text-2xl">
                  {getValidAvatar(deviceSavedProfile.avatar)}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Profile On This Device
                  </div>
                  <div className="text-sm font-black text-white">
                    {deviceSavedProfile.name}{' '}
                    <span className="text-emerald-400 font-mono text-xs">
                      (@{deviceSavedProfile.username})
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {deviceSavedProfile.rating} Elo • {deviceSavedProfile.title || 'Challenger'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sounds.playMove();
                  onLogin(deviceSavedProfile);
                  onEnterDashboard(deviceSavedProfile);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-xs shadow-md transition-transform transform active:scale-95 flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {signInError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-semibold animate-shake">
              {signInError}
            </div>
          )}

          {/* Type Username to Sign In */}
          <form onSubmit={handleSignInByUsername} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Enter Your Username *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={signInNameInput}
                  onChange={(e) => {
                    setSignInNameInput(e.target.value);
                    setSignInError(null);
                  }}
                  placeholder="e.g. alex_chess, nv14, or your username..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#26262c] border border-[#3b3b44] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#81b64c] transition-colors"
                  autoFocus
                  required
                />
              </div>
              <span className="text-[11px] text-gray-500 block">
                Accounts are private. Enter your own registered username to sign in.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-green-950/30 transition-transform transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? 'Verifying Account...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-gray-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setSignInError(null);
                }}
                className="text-[#81b64c] hover:underline font-bold"
              >
                Create a Profile
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
