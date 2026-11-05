import React from 'react';
import {
  Settings,
  Sliders,
  Palette,
  Volume2,
  Cpu,
  RotateCw,
  Trash2,
  Check,
} from 'lucide-react';
import { BoardTheme, GameSettings } from '../types/chess';
import { sounds } from '../utils/sound';

interface SettingsPageProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const themes: Array<{ id: BoardTheme; name: string; preview: [string, string] }> = [
    { id: 'green', name: 'Emerald Classic', preview: ['#ebecd0', '#739552'] },
    { id: 'wood', name: 'Warm Walnut', preview: ['#f0d9b5', '#b58863'] },
    { id: 'ocean', name: 'Oceanic Slate', preview: ['#eae9d2', '#4b7399'] },
    { id: 'classic', name: 'Tournament Silver', preview: ['#dee3e6', '#8ca2ad'] },
  ];

  const handleClearActiveGame = () => {
    if (window.confirm('Clear saved active game progress from browser storage?')) {
      localStorage.removeItem('vicky_chess_active_game_state_v1');
      alert('Active game cache cleared.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-2">
          <Settings className="w-7 h-7 text-[#81b64c]" />
          <span>Vicky AI & Board Preferences</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Customize the AI decision engine balance, visual themes, and time control settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Play Exactly Like Viknesh Checkbox / Toggle */}
        <div className={`p-6 rounded-2xl border transition-all ${
          settings.playLikeViknesh
            ? 'bg-gradient-to-r from-purple-950/40 via-[#231b33] to-[#181424] border-purple-500/60 shadow-xl shadow-purple-950/30'
            : 'bg-[#1e1e1e] border-[#2c2c30]'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                settings.playLikeViknesh
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#282830] text-gray-400'
              }`}>
                👤
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-extrabold text-white">Play Exactly Like Viknesh</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    settings.playLikeViknesh
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {settings.playLikeViknesh ? 'EXACT HUMAN MIRROR' : 'MASTER BOT MODE'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
                  {settings.playLikeViknesh ? (
                    <span className="text-purple-300 font-bold">Checked: </span>
                  ) : (
                    <span className="text-gray-400">Checkbox: </span>
                  )}
                  When checked, Vicky acts and plays <strong className="text-white">exactly like Viknesh</strong> directly from all 441 historical games with natural human moves and attacking instincts (no engine overrides). When unchecked, plays as <strong className="text-[#81b64c]">VICKY AI (Master Bot)</strong> with Stockfish 18 tactical protection.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={Boolean(settings.playLikeViknesh)}
                onChange={(e) => onUpdateSettings({ playLikeViknesh: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-[#2e2e36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
            </label>
          </div>
        </div>

        {/* Personalization Weight Slider */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Personalization Style Weight</h3>
                <p className="text-xs text-gray-400">
                  Controls how closely Vicky mirrors Viknesh's moves vs Stockfish 18 tactical purity.
                </p>
              </div>
            </div>

            <span className="font-mono text-base font-extrabold text-purple-400 px-3 py-1 rounded-lg bg-[#27272a] border border-[#333]">
              {Math.round(settings.personalizationWeight * 100)}% Style /{' '}
              {100 - Math.round(settings.personalizationWeight * 100)}% Engine
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={settings.personalizationWeight}
              onChange={(e) =>
                onUpdateSettings({ personalizationWeight: parseFloat(e.target.value) })
              }
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-500 font-mono">
              <span>Tactical Engine (Stockfish)</span>
              <span>Balanced Hybrid (Default 65%)</span>
              <span>Pure Viknesh Style</span>
            </div>
          </div>
        </div>

        {/* Stockfish Engine Depth */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Stockfish Calculation Depth</h3>
                <p className="text-xs text-gray-400">
                  Search depth for evaluating candidate moves and anti-blunder safety.
                </p>
              </div>
            </div>

            <span className="font-mono text-sm font-bold text-emerald-400">
              Depth {settings.stockfishDepth}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-xs">
            {[
              { label: 'Fast (6)', depth: 6 },
              { label: 'Standard (10)', depth: 10 },
              { label: 'Deep (14)', depth: 14 },
              { label: 'Master (18)', depth: 18 },
            ].map(({ label, depth }) => (
              <button
                key={depth}
                onClick={() => onUpdateSettings({ stockfishDepth: depth })}
                className={`p-3 rounded-xl border text-center font-semibold transition-all ${
                  settings.stockfishDepth === depth
                    ? 'bg-[#81b64c]/20 border-[#81b64c] text-white'
                    : 'bg-[#252528] border-[#333] text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Board Theme Selection */}
        <div className="p-6 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chessboard Color Theme</h3>
              <p className="text-xs text-gray-400">Select your preferred board square colors.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            {themes.map((th) => {
              const isSelected = settings.boardTheme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ boardTheme: th.id })}
                  className={`p-4 rounded-xl border flex flex-col items-center space-y-2.5 transition-all ${
                    isSelected
                      ? 'bg-[#28282e] border-[#81b64c] shadow-lg ring-1 ring-[#81b64c]'
                      : 'bg-[#252528] border-[#333] hover:border-[#444]'
                  }`}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden grid grid-cols-2 shadow">
                    <div style={{ backgroundColor: th.preview[0] }} />
                    <div style={{ backgroundColor: th.preview[1] }} />
                    <div style={{ backgroundColor: th.preview[1] }} />
                    <div style={{ backgroundColor: th.preview[0] }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-200 flex items-center space-x-1">
                    <span>{th.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#81b64c]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio & Storage Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Sound Effects</h4>
                <p className="text-[11px] text-gray-400">Moves, captures, checks, and game results</p>
              </div>
            </div>

            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                sounds.setEnabled(next);
                onUpdateSettings({ soundEnabled: next });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.soundEnabled ? 'bg-[#81b64c]' : 'bg-[#333]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[#1e1e1e] border border-[#2c2c30] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trash2 className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="text-xs font-bold text-white">Reset Active Game Cache</h4>
                <p className="text-[11px] text-gray-400">Clear interrupted game from storage</p>
              </div>
            </div>

            <button
              onClick={handleClearActiveGame}
              className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-semibold text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

