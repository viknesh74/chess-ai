import React from 'react';
import { Clock as ClockIcon, AlertCircle } from 'lucide-react';

interface ClockProps {
  timeSeconds: number; // in seconds
  isActive: boolean;
  playerName: string;
  playerTitle?: string;
  isEngine?: boolean;
  avatar?: string;
}

export const Clock: React.FC<ClockProps> = ({
  timeSeconds,
  isActive,
  playerName,
  playerTitle,
  isEngine,
}) => {
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = Math.floor(timeSeconds % 60);
  const tenths = Math.floor((timeSeconds % 1) * 10);

  const isLowTime = timeSeconds <= 30 && timeSeconds > 0;
  const isTimeOut = timeSeconds <= 0;

  // Format mm:ss or mm:ss.t if under 20s
  const formattedTime = timeSeconds < 20 && timeSeconds > 0
    ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl border transition-all ${
        isActive
          ? isLowTime
            ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
            : 'bg-[#22272b] border-[#81b64c] shadow-[0_0_12px_rgba(129,182,76,0.2)]'
          : 'bg-[#18181b] border-[#2c2c30]'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <div
          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
            isEngine
              ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md'
          }`}
        >
          {isEngine ? 'V' : playerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-semibold text-xs sm:text-sm text-gray-100 truncate">{playerName}</span>
            {playerTitle && (
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded bg-[#333] text-gray-300 shrink-0">
                {playerTitle}
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] text-gray-400 flex items-center space-x-1">
            {isActive ? (
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#81b64c] animate-pulse" />
            ) : null}
            <span>{isActive ? (isEngine ? 'Vicky Thinking...' : 'Your Turn') : 'Waiting'}</span>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg font-mono font-bold text-sm sm:text-lg tracking-wider shrink-0 ${
          isTimeOut
            ? 'bg-red-900/60 text-red-300'
            : isLowTime
            ? 'bg-red-950/80 text-red-400 animate-pulse'
            : isActive
            ? 'bg-[#121212] text-white border border-[#333]'
            : 'bg-[#141416] text-gray-400'
        }`}
      >
        <ClockIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLowTime ? 'text-red-400' : 'text-gray-400'}`} />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};

