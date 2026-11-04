import React from 'react';
import { Brain, Cpu, Sparkles, ShieldAlert, Award } from 'lucide-react';
import { VickyDecision } from '../types/chess';

interface VickyThoughtCardProps {
  decision: VickyDecision | null;
  isThinking: boolean;
  personalizationWeight: number;
}

export const VickyThoughtCard: React.FC<VickyThoughtCardProps> = ({
  decision,
  isThinking,
  personalizationWeight,
}) => {
  const stylePercent = Math.round(personalizationWeight * 100);
  const enginePercent = 100 - stylePercent;

  return (
    <div className="bg-[#1e1e1e] border border-[#2e2e32] rounded-xl p-4 shadow-lg text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2e2e32] pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>VICKY AI Mind</span>
              {isThinking && (
                <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              )}
            </h4>
            <span className="text-[11px] text-gray-400">Hybrid Decision Engine</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#27272a] border border-[#38383e]">
          <span className="text-purple-400 font-bold">{stylePercent}% Viknesh</span>
          <span className="text-gray-500">/</span>
          <span className="text-emerald-400 font-bold">{enginePercent}% Engine</span>
        </div>
      </div>

      {/* Content */}
      {isThinking ? (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 animate-pulse">
            Analyzing candidate moves against Viknesh's historical profile...
          </p>
        </div>
      ) : decision ? (
        <div className="space-y-3 text-xs">
          {/* Explanation quote */}
          <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-800/40 text-purple-200 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{decision.explanation}</p>
          </div>

          {/* Chosen move metrics */}
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded bg-[#27272a] border border-[#333]">
              <span className="block text-[10px] text-gray-400 uppercase">Played</span>
              <span className="text-sm font-mono font-bold text-white">{decision.san}</span>
            </div>
            <div className="p-2 rounded bg-[#27272a] border border-[#333]">
              <span className="block text-[10px] text-gray-400 uppercase">Style Score</span>
              <span className="text-sm font-mono font-bold text-purple-400">
                {Math.round(decision.styleScore * 100)}%
              </span>
            </div>
            <div className="p-2 rounded bg-[#27272a] border border-[#333]">
              <span className="block text-[10px] text-gray-400 uppercase">Engine Eval</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {(decision.engineEval / 100).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Top candidates comparison */}
          {decision.topCandidates && decision.topCandidates.length > 1 && (
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-gray-400 block mb-1.5">
                Evaluated Alternatives:
              </span>
              <div className="space-y-1">
                {decision.topCandidates.map((cand, idx) => (
                  <div
                    key={cand.uci}
                    className={`flex items-center justify-between px-2.5 py-1 rounded text-[11px] font-mono ${
                      cand.san === decision.san
                        ? 'bg-[#81b64c]/20 border border-[#81b64c]/50 text-white font-bold'
                        : 'bg-[#222226] text-gray-400'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-gray-500">#{idx + 1}</span>
                      <span>{cand.san}</span>
                    </span>
                    <span className="flex items-center space-x-3 text-[10px]">
                      <span className="text-purple-300">Style: {Math.round(cand.style * 100)}%</span>
                      <span className="text-emerald-300">Eval: {(cand.eval / 100).toFixed(1)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-gray-500">
          Make your first move to engage Vicky's decision neural model.
        </div>
      )}
    </div>
  );
};

