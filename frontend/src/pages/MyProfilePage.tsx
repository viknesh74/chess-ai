import React from 'react';
import {
  Trophy,
  Award,
  TrendingDown,
  ShieldAlert,
  Swords,
  Castle,
  PieChart,
  Target,
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import defaultProfile from '../data/viknesh_profile.json';
import highAccProfile from '../data/high_accuracy_profile.json';
import { PlayerProfile, HighAccuracyProfile } from '../types/chess';

export const MyProfilePage: React.FC = () => {
  const profile = defaultProfile as unknown as PlayerProfile;
  const highAcc = highAccProfile as unknown as HighAccuracyProfile;
  const overview = profile.overview;
  const openings = profile.openings;
  const castling = profile.castling;
  const tactics = profile.tactics;
  const mistakes = profile.mistakes;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c1c20] via-[#24242a] to-[#1a1a1e] border border-[#2e2e34] p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white text-3xl font-black shadow-xl">
              V
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">VIKNESH</h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#333] text-gray-300">
                  @{profile.player.username}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/40 flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span>192 High-Accuracy Games</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Historical Grand Chess Profile • Generated from {overview.totalGames} Chess.com Rapid Games
              </p>
              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-300">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <strong>{overview.winRate}%</strong> Overall Win Rate
                </span>
                <span>•</span>
                <span className="text-amber-400 font-bold">
                  {highAcc.highAccuracyWinRate}% Peak Accuracy Win Rate
                </span>
                <span>•</span>
                <span>
                  Primary Defense: <strong>French Defense (e6)</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto p-4 rounded-2xl bg-[#141416]/80 border border-[#333] text-center sm:text-right">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Analyzed Dataset</span>
            <span className="text-2xl font-black text-emerald-400">{overview.totalGames}</span>
            <span className="text-[11px] text-gray-500 font-mono">100% Parsed Cleanly</span>
          </div>
        </div>
      </div>

      {/* High-Accuracy Games Showcase Section */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1c24] to-[#16171d] border border-amber-600/30 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Viknesh's Peak High-Accuracy Games</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300">
                  {highAcc.highAccuracyGamesCount} Games (77.5% Avg Acc)
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                These games form the high-precision foundation used to train Vicky AI into a hard, master-level opponent.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-[#22242c] border border-amber-500/30 text-amber-300">
              Win Rate: <strong>{highAcc.highAccuracyWinRate}%</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#22242c] border border-amber-500/30 text-emerald-300">
              Avg CPL: <strong>{highAcc.avgHighCentipawnLoss} cp</strong>
            </div>
          </div>
        </div>

        {/* High Accuracy Top Openings */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {highAcc.topHighAccuracyOpenings.slice(0, 5).map((op) => (
            <div key={op.opening} className="p-3 rounded-xl bg-[#20222a] border border-[#30333e] text-center space-y-1">
              <span className="block font-mono font-bold text-xs text-white">{op.opening}</span>
              <span className="block text-[11px] text-amber-400 font-semibold">{op.count} Peak Games</span>
            </div>
          ))}
        </div>

        {/* Sample Top High Accuracy Matches Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2c2e38] text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">White</th>
                <th className="py-2.5 px-3">Black</th>
                <th className="py-2.5 px-3">Opening</th>
                <th className="py-2.5 px-3 text-center">Result</th>
                <th className="py-2.5 px-3 text-center">Accuracy</th>
                <th className="py-2.5 px-3 text-right">Centipawn Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262832]">
              {highAcc.highAccuracyGamesSample.slice(0, 8).map((g) => (
                <tr key={g.id} className="hover:bg-[#252834] transition-colors">
                  <td className="py-2.5 px-3 text-gray-400 text-[11px]">{g.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{g.white}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{g.black}</td>
                  <td className="py-2.5 px-3 text-gray-300">{g.opening}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">
                      {g.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-amber-400">{g.accuracy}%</td>
                  <td className="py-2.5 px-3 text-right text-gray-400">{g.cpl} cp</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outcome Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Win / Loss / Draw Breakdown */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Match Results Distribution</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-400">Wins ({overview.wins})</span>
                <span className="text-emerald-400">{overview.winRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#141416] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${overview.winRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-400">Losses ({overview.losses})</span>
                <span className="text-red-400">{overview.lossRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#141416] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full"
                  style={{ width: `${overview.lossRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-400">Draws ({overview.draws})</span>
                <span className="text-blue-400">{overview.drawRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#141416] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  style={{ width: `${overview.drawRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* White vs Black Performance */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Swords className="w-4 h-4 text-[#81b64c]" />
            <span>White vs Black Performance</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-xl bg-[#26262a] border border-[#333] space-y-2">
              <span className="text-xs text-gray-400 font-bold block">⚪ AS WHITE</span>
              <div className="text-2xl font-black text-white">{overview.whiteStats.winRate}%</div>
              <div className="text-[11px] text-gray-400">
                {overview.whiteStats.wins}W / {overview.whiteStats.losses}L / {overview.whiteStats.draws}D
              </div>
              <div className="text-[10px] text-gray-500 font-mono">({overview.whiteGames} games)</div>
            </div>

            <div className="p-4 rounded-xl bg-[#26262a] border border-[#333] space-y-2">
              <span className="text-xs text-gray-400 font-bold block">⚫ AS BLACK</span>
              <div className="text-2xl font-black text-white">{overview.blackStats.winRate}%</div>
              <div className="text-[11px] text-gray-400">
                {overview.blackStats.wins}W / {overview.blackStats.losses}L / {overview.blackStats.draws}D
              </div>
              <div className="text-[10px] text-gray-500 font-mono">({overview.blackGames} games)</div>
            </div>
          </div>
        </div>

        {/* Castling Habits */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-2">
            <Castle className="w-4 h-4 text-purple-400" />
            <span>Castling Tendencies</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Kingside Castling (O-O)</span>
              <span className="font-bold text-white">
                {castling.kingside} ({castling.kingsidePercentage}%)
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Queenside Castling (O-O-O)</span>
              <span className="font-bold text-white">
                {castling.queenside} ({castling.queensidePercentage}%)
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#2c2c30]">
              <span className="text-gray-400">Uncastled Games</span>
              <span className="font-bold text-amber-400">
                {castling.none} ({castling.uncastledPercentage}%)
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-400">Average Castling Timing</span>
              <span className="font-bold text-emerald-400">Move {castling.averageCastlingMove}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Openings Table */}
      <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Target className="w-5 h-5 text-amber-400" />
            <span>Top Opening Repertoire & Success Rates</span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">Ranked by Games Played</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2e2e34] text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Opening Variation</th>
                <th className="py-3 px-3 text-center">Played</th>
                <th className="py-3 px-3 text-center">Wins</th>
                <th className="py-3 px-3 text-center">Losses</th>
                <th className="py-3 px-3 text-center">Draws</th>
                <th className="py-3 px-3 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c2c30] font-mono">
              {openings.topOpenings.map((op, idx) => (
                <tr key={op.name} className="hover:bg-[#25252a] transition-colors">
                  <td className="py-3 px-3 font-semibold text-white flex items-center space-x-2">
                    <span className="text-gray-500 font-mono text-[10px]">#{idx + 1}</span>
                    <span>{op.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center text-gray-300 font-bold">{op.played}</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">{op.wins}</td>
                  <td className="py-3 px-3 text-center text-red-400">{op.losses}</td>
                  <td className="py-3 px-3 text-center text-blue-400">{op.draws}</td>
                  <td className="py-3 px-3 text-right font-bold text-[#81b64c]">{op.winRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
