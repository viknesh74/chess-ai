import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check } from 'lucide-react';

interface MoveHistoryProps {
  sanMoves: string[];
  currentMoveIndex: number; // -1 = start position, 0 = after move 1, etc.
  onSelectMove: (index: number) => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  openingName?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  sanMoves,
  currentMoveIndex,
  onSelectMove,
  onFirst,
  onPrev,
  onNext,
  onLast,
  openingName,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Group into pairs: [ { moveNum: 1, white: 'e4', black: 'e6' }, ... ]
  const pairs: Array<{ moveNum: number; white: string; black?: string; whiteIdx: number; blackIdx?: number }> = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    pairs.push({
      moveNum: Math.floor(i / 2) + 1,
      white: sanMoves[i],
      black: sanMoves[i + 1],
      whiteIdx: i,
      blackIdx: i + 1 < sanMoves.length ? i + 1 : undefined,
    });
  }

  // Auto-scroll to current move
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [sanMoves.length, currentMoveIndex]);

  const handleCopyPgn = () => {
    let pgnStr = '';
    pairs.forEach(p => {
      pgnStr += `${p.moveNum}. ${p.white} ${p.black || ''} `;
    });
    navigator.clipboard.writeText(pgnStr.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-[#2e2e32] rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2e32] bg-[#1a1a1d]">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-gray-400">Move Log</span>
          {openingName && (
            <div className="text-xs font-semibold text-[#81b64c] truncate max-w-[200px]" title={openingName}>
              {openingName}
            </div>
          )}
        </div>
        <button
          onClick={handleCopyPgn}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-[#27272a] hover:bg-[#333] transition-colors"
          title="Copy SAN moves"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'PGN'}</span>
        </button>
      </div>

      {/* Move list table */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
        {pairs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">Game has not started yet</div>
        ) : (
          pairs.map((pair) => (
            <div
              key={pair.moveNum}
              className="flex items-center py-1 px-2 rounded hover:bg-[#252529] transition-colors"
            >
              <span className="w-9 text-gray-500 font-semibold">{pair.moveNum}.</span>

              {/* White move */}
              <button
                onClick={() => onSelectMove(pair.whiteIdx)}
                className={`flex-1 text-left px-2 py-0.5 rounded transition-all ${
                  currentMoveIndex === pair.whiteIdx
                    ? 'bg-[#81b64c] text-white font-bold shadow'
                    : 'text-gray-200 hover:bg-[#333]'
                }`}
              >
                {pair.white}
              </button>

              {/* Black move */}
              {pair.black ? (
                <button
                  onClick={() => pair.blackIdx !== undefined && onSelectMove(pair.blackIdx)}
                  className={`flex-1 text-left px-2 py-0.5 rounded transition-all ${
                    currentMoveIndex === pair.blackIdx
                      ? 'bg-[#81b64c] text-white font-bold shadow'
                      : 'text-gray-200 hover:bg-[#333]'
                  }`}
                >
                  {pair.black}
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#2e2e32] bg-[#1a1a1d]">
        <button
          onClick={onFirst}
          disabled={currentMoveIndex < 0}
          className="p-1.5 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          title="Beginning"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onPrev}
          disabled={currentMoveIndex < 0}
          className="p-1.5 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          title="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-400 font-semibold font-mono">
          {currentMoveIndex < 0 ? 'Start' : `${currentMoveIndex + 1} / ${sanMoves.length}`}
        </span>
        <button
          onClick={onNext}
          disabled={currentMoveIndex >= sanMoves.length - 1}
          className="p-1.5 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          title="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onLast}
          disabled={currentMoveIndex >= sanMoves.length - 1}
          className="p-1.5 rounded hover:bg-[#2a2a2e] disabled:opacity-30 disabled:hover:bg-transparent text-gray-300 transition-colors"
          title="Current position"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

