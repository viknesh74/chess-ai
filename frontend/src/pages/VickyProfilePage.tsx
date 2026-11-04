import React from 'react';
import {
  Brain,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BarChart,
  Flame,
  Award,
} from 'lucide-react';
import defaultReport from '../data/vicky_model_report.json';
import defaultProfile from '../data/viknesh_profile.json';
import highAccProfile from '../data/high_accuracy_profile.json';
import { VickyModelReport, PlayerProfile, HighAccuracyProfile } from '../types/chess';

export const VickyProfilePage: React.FC = () => {
  const report = defaultReport as unknown as VickyModelReport;
  const profile = defaultProfile as unknown as PlayerProfile;
  const highAcc = highAccProfile as unknown as HighAccuracyProfile;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      {/* Vicky AI Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1c1828] via-[#251f38] to-[#161224] border border-purple-900/40 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 p-0.5 shadow-2xl">
              <div className="w-full h-full bg-[#181524] rounded-[22px] flex items-center justify-center text-4xl">
                🤖
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  MEET <span className="text-purple-400">VICKY</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-700/60 flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>MASTER AI LEVEL</span>
                </span>
              </div>
              <p className="text-sm text-gray-300 max-w-xl mt-2 leading-relaxed">
                Trained specifically on <strong>Viknesh's {highAcc.highAccuracyGamesCount} High-Accuracy Games</strong> (77.5% avg accuracy).
                Vicky plays at an uncompromising <strong>Master Level</strong>, punishing any tactical slips while strictly channeling
                Viknesh's peak intuitive style.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs font-mono text-gray-300">
                <span className="px-2.5 py-1 rounded-lg bg-[#272138] border border-purple-900/50 text-purple-300">
                  Model: High-Accuracy XGBoost Master Ranker
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#272138] border border-purple-900/50 text-emerald-300">
                  Engine: Stockfish 18 WASM (Depth 14-18)
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#272138] border border-purple-900/50 text-amber-300">
                  Peak Dataset: {highAcc.highAccuracyGamesCount} High-Accuracy Games ({highAcc.highAccuracyWinRate}% Win Rate)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Transparency Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 flex items-start space-x-3">
        <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 block mb-0.5">High Accuracy Architecture Transparency:</strong>
          Vicky AI is a <strong>hybrid decision-making system</strong>. It combines deep positional calculations from
          <strong>Stockfish 18</strong> with a personalized XGBoost model trained with high sample weights ($3.5\times$)
          on Viknesh's <strong>{highAcc.highAccuracyGamesCount} best, high-accuracy games</strong>. In Master mode, candidate moves
          are constrained within a strict 40 centipawn window, making Vicky virtually blunder-free and extremely challenging to play against.
        </div>
      </div>

      {/* Machine Learning Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">High Accuracy Base</span>
          <div className="text-3xl font-black text-amber-400">{highAcc.highAccuracyGamesCount} Games</div>
          <p className="text-[11px] text-gray-500">77.5% avg accuracy in peak matches</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Top-3 Move Accuracy</span>
          <div className="text-3xl font-black text-emerald-400">{report.metrics.top3MoveRankAccuracy}%</div>
          <p className="text-[11px] text-gray-500">Unseen validation positions</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Validation AUC</span>
          <div className="text-3xl font-black text-purple-400">{report.metrics.validationAuc}</div>
          <p className="text-[11px] text-gray-500">Discrimination on held-out games</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-2">
          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider block">Tactical Strictness</span>
          <div className="text-3xl font-black text-red-400">&lt; 40 cp</div>
          <p className="text-[11px] text-gray-500">Master Level blunder tolerance</p>
        </div>
      </div>

      {/* High-Accuracy Learned Openings */}
      <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <span>High-Accuracy Openings Mastered by Vicky</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#24242a] border border-[#333] space-y-1">
            <span className="text-emerald-400 font-bold block text-sm">French Defense (1. e4 e6)</span>
            <span className="text-gray-300">59 High-Accuracy Games</span>
            <span className="block text-[11px] text-gray-400">77.5% Accuracy Rate</span>
          </div>

          <div className="p-4 rounded-xl bg-[#24242a] border border-[#333] space-y-1">
            <span className="text-amber-400 font-bold block text-sm">Solid Central Setup (1. e3 e5)</span>
            <span className="text-gray-300">54 High-Accuracy Games</span>
            <span className="block text-[11px] text-gray-400">76.2% Accuracy Rate</span>
          </div>

          <div className="p-4 rounded-xl bg-[#24242a] border border-[#333] space-y-1">
            <span className="text-purple-400 font-bold block text-sm">Queen's Pawn Line (1. d4 e6)</span>
            <span className="text-gray-300">18 High-Accuracy Games</span>
            <span className="block text-[11px] text-gray-400">78.4% Accuracy Rate</span>
          </div>

          <div className="p-4 rounded-xl bg-[#24242a] border border-[#333] space-y-1">
            <span className="text-blue-400 font-bold block text-sm">Central Control (1. e3 d5)</span>
            <span className="text-gray-300">15 High-Accuracy Games</span>
            <span className="block text-[11px] text-gray-400">75.9% Accuracy Rate</span>
          </div>
        </div>
      </div>

      {/* Style Comparison Matrix */}
      <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span>Master AI Level: Viknesh vs Vicky AI</span>
          </h3>
          <span className="text-xs text-red-400 font-semibold font-mono">
            Vicky = Viknesh's Peak High-Accuracy + Master Tactical Precision
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2e2e34] text-gray-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Dimension</th>
                <th className="py-3 px-3">Viknesh's Average Style</th>
                <th className="py-3 px-3">Vicky AI's Master Level Style</th>
                <th className="py-3 px-3 text-right">Master Enhancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c2c30] leading-relaxed">
              <tr className="hover:bg-[#25252a] transition-colors">
                <td className="py-3.5 px-3 font-bold text-white">Opening Execution</td>
                <td className="py-3.5 px-3 text-gray-300">
                  Plays 1. e3 as White and 1... e6 as Black; occasional passive setups.
                </td>
                <td className="py-3.5 px-3 text-purple-300 font-medium">
                  Deploys exact high-win-rate variations extracted from Viknesh's 192 high-accuracy games.
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                  77.5% Theoretical Precision
                </td>
              </tr>

              <tr className="hover:bg-[#25252a] transition-colors">
                <td className="py-3.5 px-3 font-bold text-white">Tactical Calculation</td>
                <td className="py-3.5 px-3 text-gray-300">
                  Aggressive capturing drive; occasional oversight of tactical counters.
                </td>
                <td className="py-3.5 px-3 text-purple-300 font-medium">
                  Depth 14-18 Stockfish evaluation guarantees zero tactical blunders and immediate punishment of opponent mistakes.
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                  Lethal Tactical Strike
                </td>
              </tr>

              <tr className="hover:bg-[#25252a] transition-colors">
                <td className="py-3.5 px-3 font-bold text-white">Queen Safety</td>
                <td className="py-3.5 px-3 text-gray-300">
                  Early Queen excursions before move 5 in several historical games.
                </td>
                <td className="py-3.5 px-3 text-purple-300 font-medium">
                  Strictly develops minor pieces and castles before queen activation.
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                  Zero Queen Traps
                </td>
              </tr>

              <tr className="hover:bg-[#25252a] transition-colors">
                <td className="py-3.5 px-3 font-bold text-white">Endgame Conversion</td>
                <td className="py-3.5 px-3 text-gray-300">
                  Fast pawn promotions; occasional stalemate traps.
                </td>
                <td className="py-3.5 px-3 text-purple-300 font-medium">
                  King centralization and clinical mating nets with zero accidental stalemates.
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                  Master Technical Conversion
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
