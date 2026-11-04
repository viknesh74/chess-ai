import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Zap,
  Award,
  Crown,
  CheckCircle,
  ArrowRight,
  Flame,
  Gamepad2,
  Sparkles,
  Users,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Search,
} from 'lucide-react';
import { UserProfile } from '../types/chess';
import { sounds } from '../utils/sound';
import { dbRegisterUser, dbLoginUser, dbGetAllUsers } from '../utils/dbApi';
import { getValidAvatar } from '../utils/avatar';

interface LoginPageProps {
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onEnterDashboard: (user: UserProfile) => void;
  onPlay: (user: UserProfile) => void;
}

const ALL_PLAYERS_STORAGE_KEY = 'vicky_chess_all_players_v1';

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
}) => {
  // Saved players registry
  const [savedPlayers, setSavedPlayers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(ALL_PLAYERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => p && p.name && p.registeredAt !== 'Original Dataset');
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Default tab: if user has saved profiles, show 'signin', otherwise 'register'
  const [activeTab, setActiveTab] = useState<'register' | 'signin'>(() => {
    try {
      const saved = localStorage.getItem(ALL_PLAYERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.filter((p) => p && p.name && p.registeredAt !== 'Original Dataset').length > 0) {
          return 'signin';
        }
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

  // Sign in form state
  const [signInNameInput, setSignInNameInput] = useState('');
  const [signInError, setSignInError] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  // Sync with SQLite Database on Mount
  useEffect(() => {
    dbGetAllUsers().then((dbUsers) => {
      if (dbUsers && dbUsers.length > 0) {
        setSavedPlayers((prev) => {
          const map = new Map<string, UserProfile>();
          for (const u of [...prev, ...dbUsers]) {
            if (u && u.username) {
              const sanitized = {
                ...u,
                avatar: getValidAvatar(u.avatar),
              };
              map.set(u.username.toLowerCase(), sanitized);
            }
          }
          const merged = Array.from(map.values());
          localStorage.setItem(ALL_PLAYERS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      }
    });
  }, []);

  const handleSkillSelect = (skill: (typeof SKILL_LEVELS)[0]) => {
    setSelectedSkill(skill.level);
    setRating(skill.elo);
  };

  const validateAndCreateUser = (): UserProfile | null => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).');
      return null;
    }

    const trimmedUsername = (username.trim() || trimmedName.toLowerCase().replace(/\s+/g, '_')).trim();

    // Load latest players from localStorage
    let currentPlayers: UserProfile[] = savedPlayers;
    try {
      const saved = localStorage.getItem(ALL_PLAYERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) currentPlayers = parsed;
      }
    } catch {
      // ignore
    }

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

    // Filter out duplicate username/name and prepend the new user
    const updatedPlayers = [
      newUser,
      ...currentPlayers.filter(
        (p) =>
          p.username.toLowerCase().trim() !== trimmedUsername.toLowerCase() &&
          p.name.toLowerCase().trim() !== trimmedName.toLowerCase()
      ),
    ];
    setSavedPlayers(updatedPlayers);
    localStorage.setItem(ALL_PLAYERS_STORAGE_KEY, JSON.stringify(updatedPlayers));
    // Persist to SQLite Database
    dbRegisterUser({
      name: newUser.name,
      username: newUser.username,
      rating: newUser.rating,
      avatar: newUser.avatar,
      title: newUser.title,
    }).catch((err) => console.warn('Could not sync user to DB:', err));
    return newUser;
  };

  // Register and proceed to Sign In step
  const handleRegisterProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const user = validateAndCreateUser();
    if (user) {
      sounds.playMove();
      setName('');
      setUsername('');
      setErrorMessage(null);
      setRegistrationNotice(`✓ Profile created for ${user.name}! Please enter your username "${user.username}" below to sign in.`);
      setSignInNameInput(user.username);
      setSignInError(null);
      setActiveTab('signin');
    }
  };

  // Sign in by verifying correct username
  const handleSignInByUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = signInNameInput.trim().toLowerCase();
    if (!query) {
      setSignInError('Please enter your registered username.');
      return;
    }

    // Always check both state and latest localStorage
    let players: UserProfile[] = savedPlayers;
    try {
      const saved = localStorage.getItem(ALL_PLAYERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          players = parsed;
        }
      }
    } catch {
      // ignore
    }

    let matched = players.find(
      (p) =>
        (p.username && p.username.toLowerCase().trim() === query) ||
        (p.name && p.name.toLowerCase().trim() === query)
    );

    // If not found in cache, check SQLite DB
    if (!matched) {
      const dbUser = await dbLoginUser(query);
      if (dbUser) {
        matched = dbUser;
        setSavedPlayers((prev) => [dbUser, ...prev.filter(p => p.username.toLowerCase() !== dbUser.username.toLowerCase())]);
      }
    }

    if (matched) {
      sounds.playMove();
      setSignInError(null);
      setRegistrationNotice(null);
      onLogin(matched);
      onEnterDashboard(matched);
    } else {
      setSignInError(`Incorrect username! No registered account found matching "${signInNameInput.trim()}". Please enter your correct username.`);
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
          Create Profile & Play With <span className="text-[#81b64c]">VICKY AI</span>
        </h1>
        <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
          Create your personalized chess profile with your name and avatar, then sign in to access your dashboard and challenge Vicky AI in 10+0 Rapid chess.
        </p>
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
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-xs shadow-lg shadow-green-950/40 transition-transform transform hover:scale-105 active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
            <button
              onClick={() => onPlay(currentUser)}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-[#27272a] hover:bg-[#333] border border-[#3e3e44] text-white font-bold text-xs transition-colors"
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
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'register'
              ? 'bg-[#81b64c] text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-[#222226]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>1. Create New Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('signin');
            setSignInError(null);
          }}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'signin'
              ? 'bg-[#81b64c] text-white shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-[#222226]'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>2. Sign In With Username {savedPlayers.length > 0 && `(${savedPlayers.length})`}</span>
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
              <span>Create Your Challenger Profile</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Register your name and username. After registering, you will sign in with your username to enter the dashboard.
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
                Username (Used to Sign In) *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_chess or challenger01"
                className="w-full px-4 py-3 rounded-xl bg-[#26262c] border border-[#3b3b44] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#81b64c] transition-colors"
              />
              <span className="text-[11px] text-gray-500 block">
                Required for sign-in. Auto-generated from name if left empty.
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
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center space-y-1 ${
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
              className="w-full py-4 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-green-950/40 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              <span>Register Profile & Proceed to Sign In</span>
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
              <span>Sign In With Your Username</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Enter your correct registered username below to sign in and enter your dashboard.
            </p>
          </div>

          {registrationNotice && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center space-x-2.5 animate-fade-in shadow-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{registrationNotice}</span>
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
                Registered Username *
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
                  placeholder="Enter your registered username (e.g. alex_chess)..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#26262c] border border-[#3b3b44] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#81b64c] transition-colors"
                  autoFocus
                  required
                />
              </div>
              <span className="text-[11px] text-gray-500 block">
                You must enter the exact registered username to sign in.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-green-950/30 transition-transform transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* List of Registered Accounts on this device */}
          <div className="space-y-3 pt-2 border-t border-[#2d2d34]">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {savedPlayers.length > 0 ? 'Registered Accounts on this Device:' : 'No Registered Profiles:'}
            </h4>

            {savedPlayers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#24242a] border border-[#34343e] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#2c2c34] text-gray-400 mx-auto flex items-center justify-center text-2xl">
                  👤
                </div>
                <h4 className="text-sm font-bold text-white">No Profiles Registered Yet</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  You haven't registered any profiles on this device yet. Click below to register your profile!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegistrationNotice(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-bold text-xs transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Your Profile Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedPlayers.map((player) => (
                  <div
                    key={player.username}
                    onClick={() => {
                      setSignInNameInput(player.username);
                      setSignInError(null);
                    }}
                    className="p-3.5 rounded-2xl bg-[#24242a] border border-[#34343e] hover:border-[#81b64c]/70 hover:bg-[#2b2b32] cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                    title={`Click to fill username "${player.username}" into sign in`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2d2d34] border border-[#3e3e48] flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                        {getValidAvatar(player.avatar)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-sm text-white group-hover:text-[#81b64c] transition-colors">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-gray-400">
                          <span className="font-mono text-emerald-400 font-bold">
                            @{player.username}
                          </span>
                          <span>•</span>
                          <span>{player.rating} Elo</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-gray-400 group-hover:text-emerald-400 font-semibold">
                      <span>Use</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
