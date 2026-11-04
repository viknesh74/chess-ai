import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import { ChessPiece } from './ChessPiece';
import { BoardTheme, PieceColor } from '../types/chess';
import { PromotionModal } from './PromotionModal';
import { sounds } from '../utils/sound';

interface ChessboardProps {
  chess: Chess;
  isFlipped?: boolean;
  theme?: BoardTheme;
  interactive?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  lastMove?: { from: string; to: string } | null;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  chess,
  isFlipped = false,
  theme = 'green',
  interactive = true,
  onMove,
  lastMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [draggingSquare, setDraggingSquare] = useState<string | null>(null);

  // Files and Ranks
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = isFlipped ? [...files].reverse() : files;
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;

  // Theme colors
  const getSquareColor = (fileIdx: number, rankIdx: number) => {
    const isLight = (fileIdx + rankIdx) % 2 === 0;
    switch (theme) {
      case 'wood':
        return isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
      case 'ocean':
        return isLight ? 'bg-[#eae9d2]' : 'bg-[#4b7399]';
      case 'classic':
        return isLight ? 'bg-[#dee3e6]' : 'bg-[#8ca2ad]';
      case 'green':
      default:
        return isLight ? 'bg-[#ebecd0]' : 'bg-[#739552]';
    }
  };

  const board = chess.board();

  // Find king square if in check
  let inCheckKingSquare: string | null = null;
  if (chess.inCheck()) {
    const turnColor = chess.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turnColor) {
          inCheckKingSquare = `${files[c]}${ranks[r]}`;
          break;
        }
      }
    }
  }

  // Handle square selection / click
  const handleSquareClick = (square: string) => {
    if (!interactive) return;

    // If already selected, check if clicked square is a legal destination
    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const matchMove = legalMoves.find((m) => m.to === square);
      if (matchMove) {
        // Check for pawn promotion
        const piece = chess.get(selectedSquare as Square);
        const isPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && square.endsWith('8')) ||
            (piece.color === 'b' && square.endsWith('1')));

        if (isPromotion) {
          setPendingPromotion({ from: selectedSquare, to: square });
        } else {
          onMove({ from: selectedSquare, to: square });
        }
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select piece
    const piece = chess.get(square as Square);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as Square, verbose: true });
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, square: string) => {
    if (!interactive) return;
    const piece = chess.get(square as Square);
    if (!piece || piece.color !== chess.turn()) {
      e.preventDefault();
      return;
    }
    setDraggingSquare(square);
    setSelectedSquare(square);
    const moves = chess.moves({ square: square as Square, verbose: true });
    setLegalMoves(moves);
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: string) => {
    e.preventDefault();
    const fromSquare = draggingSquare || e.dataTransfer.getData('text/plain');
    setDraggingSquare(null);

    if (!fromSquare || fromSquare === targetSquare) return;

    const moves = chess.moves({ square: fromSquare as Square, verbose: true });
    const matchMove = moves.find((m) => m.to === targetSquare);

    if (matchMove) {
      const piece = chess.get(fromSquare as Square);
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && targetSquare.endsWith('8')) ||
          (piece.color === 'b' && targetSquare.endsWith('1')));

      if (isPromotion) {
        setPendingPromotion({ from: fromSquare, to: targetSquare });
      } else {
        onMove({ from: fromSquare, to: targetSquare });
      }
    }

    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handlePromotionSelect = (promotedType: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      onMove({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: promotedType,
      });
      setPendingPromotion(null);
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[620px] mx-auto select-none rounded-xl overflow-hidden shadow-2xl border-2 sm:border-4 border-[#2b2b2e] touch-manipulation">
      {/* 8x8 Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full touch-manipulation">
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);

            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isLastMoveSquare = isLastMoveFrom || isLastMoveTo;

            const legalMove = legalMoves.find((m) => m.to === square);
            const isLegalDestination = Boolean(legalMove);
            const isCapture = isLegalDestination && (piece || legalMove?.flags.includes('e'));

            const isInCheck = inCheckKingSquare === square;

            // Coordinate labels
            const showFileCoord = rankIdx === 7;
            const showRankCoord = fileIdx === 0;

            const baseColorClass = getSquareColor(fileIdx, rankIdx);

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 touch-manipulation select-none ${baseColorClass}`}
              >
                {/* Last move highlight */}
                {isLastMoveSquare && (
                  <div className="absolute inset-0 bg-[#f7d65a]/45 z-0 pointer-events-none" />
                )}

                {/* Selected square highlight */}
                {isSelected && (
                  <div className="absolute inset-0 bg-[#b9ca43]/60 z-0 pointer-events-none" />
                )}

                {/* King in Check indicator */}
                {isInCheck && (
                  <div className="absolute inset-0 bg-radial from-red-600/90 to-red-600/20 animate-pulse z-0 pointer-events-none" />
                )}

                {/* Piece */}
                {piece && (
                  <div
                    draggable={interactive && piece.color === chess.turn()}
                    onDragStart={(e) => handleDragStart(e, square)}
                    className={`relative z-10 w-full h-full p-0.5 sm:p-1.5 flex items-center justify-center transform active:scale-95 transition-transform pointer-events-none ${
                      draggingSquare === square ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <ChessPiece type={piece.type} color={piece.color} />
                  </div>
                )}

                {/* Legal Move Indicators */}
                {isLegalDestination && !isCapture && (
                  <div className="absolute z-20 w-3.5 h-3.5 rounded-full bg-black/25 pointer-events-none" />
                )}
                {isLegalDestination && isCapture && (
                  <div className="absolute z-20 inset-1 rounded-full border-4 border-black/30 pointer-events-none animate-pulse" />
                )}

                {/* File coordinate label (bottom rank) */}
                {showFileCoord && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-bold font-mono pointer-events-none ${
                      (fileIdx + rankIdx) % 2 === 0 ? 'text-[#739552]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Rank coordinate label (leftmost file) */}
                {showRankCoord && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-bold font-mono pointer-events-none ${
                      (fileIdx + rankIdx) % 2 === 0 ? 'text-[#739552]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          color={chess.turn()}
          onSelect={handlePromotionSelect}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
};

