import React from 'react';

interface EvaluationBarProps {
  scoreCentipawns: number;
  mateInMoves?: number;
  flipped?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  scoreCentipawns,
  mateInMoves,
  flipped = false,
}) => {
  // Convert centipawns into a percentage between 5% and 95%
  let whitePercent = 50;

  if (mateInMoves !== undefined && mateInMoves !== null) {
    whitePercent = mateInMoves > 0 ? 98 : 2;
  } else {
    // Sigmoid curve to scale score from -1000 to +1000 into 0..100%
    const winChance = 1 / (1 + Math.pow(10, -scoreCentipawns / 400));
    whitePercent = Math.min(96, Math.max(4, winChance * 100));
  }

  const displayPercent = flipped ? 100 - whitePercent : whitePercent;

  let label = '0.0';
  if (mateInMoves !== undefined && mateInMoves !== null) {
    label = `M${Math.abs(mateInMoves)}`;
  } else {
    const pawns = scoreCentipawns / 100;
    label = pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }

  return (
    <div className="relative w-7 h-full min-h-[360px] bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#333] flex flex-col justify-end shadow-inner select-none">
      {/* Black's portion */}
      <div
        className="w-full bg-[#1b1b1b] transition-all duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${100 - displayPercent}%` }}
      >
        {displayPercent < 50 && (
          <span className="text-[10px] font-mono font-bold text-gray-300">
            {label}
          </span>
        )}
      </div>

      {/* Center line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gray-500/30 z-10" />

      {/* White's portion */}
      <div
        className="w-full bg-[#ffffff] transition-all duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${displayPercent}%` }}
      >
        {displayPercent >= 50 && (
          <span className="text-[10px] font-mono font-bold text-gray-800">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

