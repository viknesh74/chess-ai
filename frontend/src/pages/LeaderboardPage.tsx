import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Search,
  RefreshCw,
  Gamepad2,
  TrendingUp,
  Flame,
  Award,
  Sparkles,
  Shield,
  UserCheck,
  Play
} from 'lucide-react';
import { UserProfile } from '../types/chess';
import { dbGetLeaderboard, LeaderboardEntry } from '../utils/dbApi';
import { getValidAvatar } from '../utils/avatar';

interface LeaderboardPageProps {
  currentUser?: UserProfile | null;
  onStartGame: () => void;
  onNavigateLogin?: () => void;
  onReplayPlayer?: (username: string) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUser,
  onStartGame,
  onNavigateLogin,
  onReplayPlayer,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'topRated' | 'winRate' | 'mostActive'>('all');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await dbGetLeaderboard();
      setEntries(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Filter and sort entries
  const filteredEntries = entries
    .filter((entry) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.username.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (filter === 'topRated') return b.rating - a.rating;
      if (filter === 'winRate') return b.winRate - a.winRate;
      if (filter === 'mostActive') return b.totalMatches - a.totalMatches;
      return a.rank - b.rank;
    });

  // Identify current user's entry
  const userEntry = currentUser
    ? entries.find(
        (e) => e.username.toLowerCase() === currentUser.username?.toLowerCase()
      )
    : null;

  // Podium top 3
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black text-sm shadow-lg shadow-amber-500/30">
          👑
        </span>
      );
    if (rank === 2)
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 font-black text-sm shadow-lg shadow-slate-300/30">
          🥈
        </span>
      );
    if (rank === 3)
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white font-black text-sm shadow-lg shadow-amber-700/30">
          🥉
        </span>
      );
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#26262b] text-gray-400 font-bold text-xs border border-[#333339]">
        #{rank}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#18181b] via-[#202026] to-[#121214] border border-[#2b2b32] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-yellow-600/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
              <Trophy className="w-3.5 h-3.5" />
              <span>OFFICIAL LEADERBOARD</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Challenger Standings
            </h1>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Every game played against <strong className="text-gray-200">Vicky AI</strong> updates in real-time.
              Compete to climb the Elo leaderboard, boost your win rate, and claim the #1 Challenger crown.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-[#222227] hover:bg-[#2c2c33] text-gray-200 font-bold text-xs border border-[#33333d] transition-all disabled:opacity-50"
              title="Refresh live standings from database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh Standings</span>
            </button>

            <button
              onClick={onStartGame}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm shadow-xl shadow-green-950/40 transition-transform transform hover:scale-105 active:scale-95"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>PLAY MATCH NOW</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current User Standing Card */}
      {currentUser && (
        <div className="rounded-2xl bg-[#1b1b1f] border border-[#2e2e36] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#282830] border border-[#3a3a44] flex items-center justify-center text-2xl shadow-inner">
              {getValidAvatar(currentUser.avatar)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-base">{currentUser.name}</span>
                <span className="text-xs text-gray-400 font-mono">@{currentUser.username}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/30 uppercase">
                  {currentUser.title || 'Challenger'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {userEntry ? (
                  <>
                    Ranked <strong className="text-amber-400 font-bold">#{userEntry.rank}</strong> out of {entries.length} players •{' '}
                    <strong className="text-white">{userEntry.totalMatches}</strong> games played •{' '}
                    <strong className="text-emerald-400">{userEntry.winRate}%</strong> win rate
                  </>
                ) : (
                  'Play your first match against Vicky to earn your official rank!'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-center">
            <div className="px-4 py-2 rounded-xl bg-[#232329] border border-[#31313a]">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Your Elo</span>
              <span className="text-lg font-black text-white">{currentUser.rating || 1200}</span>
            </div>
            {userEntry && (
              <div className="px-4 py-2 rounded-xl bg-[#232329] border border-[#31313a]">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Record (W/L/D)</span>
                <span className="text-sm font-bold text-emerald-400">
                  {userEntry.wins}W <span className="text-red-400">{userEntry.losses}L</span>{' '}
                  <span className="text-gray-400">{userEntry.draws}D</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Rank 2 */}
          <div className="order-2 md:order-1 rounded-2xl bg-gradient-to-b from-[#1c1c22] to-[#16161a] border border-[#2c2c36] p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-3 left-3">
              <span className="text-2xl">🥈</span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border-2 border-slate-400/50 flex items-center justify-center text-3xl shadow-xl mt-2 mb-3">
              {getValidAvatar(top2?.avatar)}
            </div>
            <h3 className="font-extrabold text-white text-lg">{top2?.name || 'Open Slot'}</h3>
            <span className="text-xs text-gray-400 font-mono">@{top2?.username || 'challenger'}</span>
            <div className="mt-4 px-3 py-1 rounded-full bg-slate-400/10 border border-slate-400/30 text-slate-300 font-black text-sm">
              {top2 ? `${top2.rating} Elo` : '1200 Elo'}
            </div>
            <div className="mt-3 flex items-center justify-between w-full pt-3 border-t border-[#26262e] text-xs text-gray-400">
              <span>Win Rate: <strong className="text-slate-300">{top2?.winRate ?? 0}%</strong></span>
              <span>Matches: <strong className="text-white">{top2?.totalMatches ?? 0}</strong></span>
            </div>
          </div>

          {/* Rank 1 (Gold / Crown) */}
          <div className="order-1 md:order-2 rounded-2xl bg-gradient-to-b from-[#22211d] via-[#1a1917] to-[#141416] border-2 border-amber-500/40 p-7 flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-amber-500/10 transform md:-translate-y-2">
            <div className="absolute top-3 left-3 flex items-center space-x-1">
              <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">#1 Champion</span>
            </div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/30 to-yellow-500/10 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-2xl shadow-amber-500/20 mt-4 mb-3">
              {getValidAvatar(top1?.avatar)}
            </div>
            <h3 className="font-black text-white text-xl">{top1?.name || 'No Champion Yet'}</h3>
            <span className="text-xs text-amber-400/80 font-mono">@{top1?.username || 'vicky'}</span>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-base shadow-lg shadow-amber-500/20">
              {top1 ? `${top1.rating} Elo` : '1500 Elo'}
            </div>
            <div className="mt-4 flex items-center justify-around w-full pt-4 border-t border-amber-500/20 text-xs text-gray-300">
              <span>Win Rate: <strong className="text-amber-400 font-bold">{top1?.winRate ?? 0}%</strong></span>
              <span>•</span>
              <span>Matches: <strong className="text-white font-bold">{top1?.totalMatches ?? 0}</strong></span>
              <span>•</span>
              <span>Wins: <strong className="text-emerald-400 font-bold">{top1?.wins ?? 0}</strong></span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="order-3 rounded-2xl bg-gradient-to-b from-[#1c1c22] to-[#16161a] border border-[#2c2c36] p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-3 left-3">
              <span className="text-2xl">🥉</span>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border-2 border-amber-700/50 flex items-center justify-center text-3xl shadow-xl mt-2 mb-3">
              {getValidAvatar(top3?.avatar)}
            </div>
            <h3 className="font-extrabold text-white text-lg">{top3?.name || 'Open Slot'}</h3>
            <span className="text-xs text-gray-400 font-mono">@{top3?.username || 'challenger'}</span>
            <div className="mt-4 px-3 py-1 rounded-full bg-amber-700/20 border border-amber-700/40 text-amber-400 font-black text-sm">
              {top3 ? `${top3.rating} Elo` : '1200 Elo'}
            </div>
            <div className="mt-3 flex items-center justify-between w-full pt-3 border-t border-[#26262e] text-xs text-gray-400">
              <span>Win Rate: <strong className="text-amber-400">{top3?.winRate ?? 0}%</strong></span>
              <span>Matches: <strong className="text-white">{top3?.totalMatches ?? 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="rounded-2xl bg-[#17171a] border border-[#282830] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players by name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#202026] border border-[#33333d] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#81b64c] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-medium mr-1">Sort By:</span>
          {(
            [
              { id: 'all', label: 'Overall Rank' },
              { id: 'topRated', label: 'Top Elo' },
              { id: 'winRate', label: 'Win Rate' },
              { id: 'mostActive', label: 'Most Games' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === t.id
                  ? 'bg-[#81b64c] text-white shadow-md shadow-green-950/30'
                  : 'bg-[#222228] text-gray-300 hover:bg-[#2b2b32] border border-[#303038]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="overflow-hidden rounded-2xl bg-[#17171a] border border-[#282830] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#26262e] bg-[#1d1d22] text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Player</th>
                <th className="py-3.5 px-4 text-center">Elo Rating</th>
                <th className="py-3.5 px-4 text-center">Win Rate</th>
                <th className="py-3.5 px-4 text-center">Record (W-L-D)</th>
                <th className="py-3.5 px-4 text-center">Matches</th>
                <th className="py-3.5 px-4 text-center">Recent Form</th>
                <th className="py-3.5 px-4 text-center">Replay Games</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232329] text-sm">
              {/* Vicky AI Master Bot Benchmark Row */}
              <tr className="bg-purple-950/20 hover:bg-purple-950/30 transition-colors border-b border-purple-800/30">
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-purple-900/40 text-purple-300 font-extrabold text-xs border border-purple-700/50">
                    BOT
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-purple-300">VICKY AI (Master Bot)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-900/60 text-purple-300 border border-purple-700/60 uppercase">
                          Benchmark
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">192 High-Accuracy Profile Games</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-xl bg-purple-900/40 border border-purple-700/50 text-purple-200 font-black">
                    2200
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="font-extrabold text-purple-300">Master Level</span>
                </td>
                <td className="py-4 px-4 text-center text-xs text-gray-400 font-mono">
                  Engine Model v2.0
                </td>
                <td className="py-4 px-4 text-center font-bold text-gray-300">
                  Always Ready
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="w-5 h-5 rounded-full bg-purple-900/80 text-[10px] font-bold text-purple-200 flex items-center justify-center border border-purple-700">★</span>
                    <span className="w-5 h-5 rounded-full bg-purple-900/80 text-[10px] font-bold text-purple-200 flex items-center justify-center border border-purple-700">★</span>
                    <span className="w-5 h-5 rounded-full bg-purple-900/80 text-[10px] font-bold text-purple-200 flex items-center justify-center border border-purple-700">★</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-[11px] text-purple-400/80 font-bold">Bot Benchmark</span>
                </td>
              </tr>

              {/* Dynamic User Rows from MongoDB */}
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#81b64c]" />
                      <span className="text-sm font-semibold">Loading live standings...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <p className="text-base font-bold text-gray-300">No players found matching your query</p>
                    <p className="text-xs text-gray-500 mt-1">Try clearing your search or register a new profile.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((player) => {
                  const isCurrent =
                    currentUser &&
                    player.username.toLowerCase() ===
                      currentUser.username?.toLowerCase();

                  return (
                    <tr
                      key={player.username}
                      className={`hover:bg-[#202026] transition-colors ${
                        isCurrent ? 'bg-[#81b64c]/10 border-l-4 border-[#81b64c]' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center">
                        {getRankBadge(player.rank)}
                      </td>

                      {/* Player Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getValidAvatar(player.avatar)}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`font-black ${
                                  isCurrent ? 'text-[#81b64c]' : 'text-white'
                                }`}
                              >
                                {player.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-[#81b64c] text-white">
                                  YOU
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#26262e] text-gray-400 border border-[#33333d] uppercase">
                                {player.title || 'Challenger'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                              @{player.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-xl bg-[#23232a] border border-[#33333e] text-white font-black text-sm">
                          {player.rating}
                        </span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-extrabold text-sm text-emerald-400">
                            {player.winRate}%
                          </span>
                          <div className="w-16 h-1.5 bg-[#26262e] rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(player.winRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Record */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-gray-300">
                          <span className="text-emerald-400">{player.wins}W</span> -{' '}
                          <span className="text-red-400">{player.losses}L</span> -{' '}
                          <span className="text-gray-400">{player.draws}D</span>
                        </span>
                      </td>

                      {/* Total Matches */}
                      <td className="py-4 px-4 text-center font-bold text-gray-200">
                        {player.totalMatches}
                      </td>

                      {/* Recent Form */}
                      <td className="py-4 px-4 text-center">
                        {player.form && player.form.length > 0 ? (
                          <div className="flex items-center justify-center space-x-1">
                            {player.form.map((f, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center ${
                                  f === 'W'
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                                    : f === 'L'
                                    ? 'bg-red-950/80 text-red-400 border border-red-700/60'
                                    : 'bg-gray-800 text-gray-300 border border-gray-600'
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">No matches yet</span>
                        )}
                      </td>

                      {/* Replay Action */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => onReplayPlayer && onReplayPlayer(player.username)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#23232b] hover:bg-[#81b64c] text-gray-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                          title={`Replay ${player.name}'s matches against Vicky AI`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Replay ({player.totalMatches})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA Card */}
      <div className="rounded-3xl bg-gradient-to-r from-[#17171a] via-[#1c1c22] to-[#141416] border border-[#2b2b32] p-8 text-center space-y-4">
        <Sparkles className="w-8 h-8 text-[#81b64c] mx-auto" />
        <h3 className="text-2xl font-black text-white">Want to Climb the Leaderboard?</h3>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Challenge Vicky AI in a 10+0 Rapid game. A win against Vicky earns Elo points and pushes your ranking to the top of the leaderboard.
        </p>
        <div className="pt-2">
          <button
            onClick={onStartGame}
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm shadow-xl shadow-green-950/50 transition-transform transform hover:scale-105 active:scale-95"
          >
            <Gamepad2 className="w-5 h-5" />
            <span>PLAY VICKY AI NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};

