import React from 'react';
import {
  Gamepad2,
  TrendingUp,
  Brain,
  ShieldCheck,
  Trophy,
  History,
  Zap,
  ArrowRight,
  Sparkles,
  Award,
} from 'lucide-react';
import { PlayerProfile, VickyModelReport, GameRecord, UserProfile } from '../types/chess';
import defaultProfile from '../data/viknesh_profile.json';
import defaultModelReport from '../data/vicky_model_report.json';
import { getValidAvatar } from '../utils/avatar';

interface HomePageProps {
  onStartGame: () => void;
  onNavigate: (tab: any) => void;
  currentUser?: UserProfile | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartGame, onNavigate, currentUser }) => {
  const profile = defaultProfile as unknown as PlayerProfile;
  const report = defaultModelReport as unknown as VickyModelReport;

  const playerName = currentUser?.name || 'Challenger';
  const total = profile.overview.totalGames;
  const wins = profile.overview.wins;
  const losses = profile.overview.losses;
  const draws = profile.overview.draws;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#18181b] via-[#202024] to-[#121214] border border-[#2e2e34] p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#81b64c]/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trained on {total} Real Chess.com Games</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Play Against <span className="text-[#81b64c]">VICKY</span>, Your Personalized AI Mirror
          </h1>

          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            Welcome, <strong className="text-white font-bold">{playerName}</strong>. Vicky has studied Viknesh's exact historical
            openings, tactical capturing drives, and pawn structures. It plays with high-accuracy master decisions, using
            Stockfish 18 tactical pruning to challenge you at a competitive level.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onStartGame}
              className="flex items-center space-x-3 px-8 py-4 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-base shadow-xl shadow-green-950/30 transition-all transform hover:scale-105 active:scale-95"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>PLAY AGAINST VICKY (10+0 Rapid)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-[#27272a] hover:bg-[#333338] text-gray-200 font-bold text-sm border border-[#3f3f46] transition-colors"
            >
              <span className="text-base">{getValidAvatar(currentUser?.avatar)}</span>
              <span>Register / Switch Player ({playerName})</span>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-[#27272a] hover:bg-[#333338] text-gray-200 font-bold text-sm border border-[#3f3f46] transition-colors"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Live Match History</span>
            </button>

            <button
              onClick={() => onNavigate('leaderboard')}
              className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-[#27272a] hover:bg-[#333338] text-gray-200 font-bold text-sm border border-[#3f3f46] transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>🏆 Leaderboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Games</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white">{total}</div>
          <div className="text-xs text-gray-400">Imported & Verified</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Games Won</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{wins}</div>
          <div className="text-xs text-gray-400">{profile.overview.winRate}% Win Rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Games Lost</span>
            <TrendingUp className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400">{losses}</div>
          <div className="text-xs text-gray-400">{profile.overview.lossRate}% Loss Rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span>Games Drawn</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400">{draws}</div>
          <div className="text-xs text-gray-400">{profile.overview.drawRate}% Draw Rate</div>
        </div>
      </div>

      {/* Vicky AI Status & Opening Repertoire Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Model Status Card */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span>Vicky AI Engine Status</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-900/40 text-purple-300 border border-purple-700/50">
              ACTIVE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Architecture</span>
              <span className="font-semibold text-white">Stockfish 18 + XGBoost</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Training Samples</span>
              <span className="font-semibold text-white">{report.trainPositionsSampled.toLocaleString()} positions</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Validation Games</span>
              <span className="font-semibold text-white">{report.valGamesCount} unseen games</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Top-3 Move Prediction</span>
              <span className="font-bold text-emerald-400">{report.metrics.top3MoveRankAccuracy}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Validation AUC</span>
              <span className="font-bold text-purple-400">{report.metrics.validationAuc}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('settings')}
            className="w-full py-2.5 rounded-xl bg-[#27272a] hover:bg-[#333] text-gray-200 text-xs font-bold transition-colors"
          >
            Configure Engine Settings
          </button>
        </div>

        {/* Favorite Openings Learned */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Learned Opening Preferences</span>
            </h3>
            <button
              onClick={() => onNavigate('stats')}
              className="text-xs text-[#81b64c] hover:underline font-semibold"
            >
              View Analytics
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.openings.topOpenings.slice(0, 4).map((op) => (
              <div
                key={op.name}
                className="p-3.5 rounded-xl bg-[#252529] border border-[#333338] space-y-2 hover:border-[#81b64c]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-white">{op.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#1e1e22] text-[#81b64c]">
                    {op.winRate}% Wins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Played {op.played} times</span>
                  <span>
                    {op.wins}W / {op.losses}L / {op.draws}D
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#232328] border border-[#333338] text-xs text-gray-300 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-white">White 1st Move:</span>
              <span className="font-mono font-bold text-[#81b64c]">1. e3 (180+ games)</span>
              <span className="text-gray-500">•</span>
              <span className="font-bold text-white">Black Response:</span>
              <span className="font-mono font-bold text-purple-400">1... e6 (French Defense, 170+ games)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches Against Vicky AI */}
      {(() => {
        let liveMatches: GameRecord[] = [];
        try {
          const saved = localStorage.getItem('vicky_live_match_history');
          if (saved) {
            const all: GameRecord[] = JSON.parse(saved);
            liveMatches = all.filter((g) => {
              if (currentUser?.name) {
                const nameLower = currentUser.name.toLowerCase().trim();
                return (
                  (g.userName && g.userName.toLowerCase().trim() === nameLower) ||
                  g.white?.toLowerCase().includes(nameLower) ||
                  g.black?.toLowerCase().includes(nameLower)
                );
              }
              return true;
            });
          }
        } catch {
          // ignore
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-gray-400" />
                <span>Live Matches Against Vicky AI</span>
              </h3>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-[#81b64c] hover:underline font-semibold"
              >
                View Live Match History ({liveMatches.length})
              </button>
            </div>

            {liveMatches.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                    ⚔️
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">No live matches played yet</h4>
                    <p className="text-xs text-gray-400">
                      Challenge Vicky AI in a 10+0 Rapid game to record your personal head-to-head match history.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onStartGame}
                  className="px-5 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-bold text-xs shadow-md transition-transform transform active:scale-95 shrink-0"
                >
                  Play Vicky AI Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {liveMatches.slice(0, 3).map((game) => (
                  <div
                    key={game.id}
                    onClick={() => onNavigate('history')}
                    className="p-4 rounded-xl bg-[#1e1e1e] border border-[#2c2c30] hover:border-[#3f3f46] cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono">{game.date || 'Live Match'}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          game.outcome === 'win'
                            ? 'bg-emerald-950 text-emerald-400'
                            : game.outcome === 'loss'
                            ? 'bg-red-950 text-red-400'
                            : 'bg-blue-950 text-blue-400'
                        }`}
                      >
                        {game.outcome === 'win'
                          ? 'VICTORY 1-0'
                          : game.outcome === 'loss'
                          ? 'DEFEAT 0-1'
                          : 'DRAW 1/2-1/2'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm font-semibold text-white">
                        <span>⚪ {game.white}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold text-white">
                        <span>⚫ {game.black}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 pt-1 flex items-center justify-between border-t border-[#2c2c30]">
                      <span>{game.opening}</span>
                      <span>{game.moveCount} moves</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

