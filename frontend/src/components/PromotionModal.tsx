import React from 'react';
import { ChessPiece } from './ChessPiece';
import { PieceType, PieceColor } from '../types/chess';

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect, onCancel }) => {
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; label: string }> = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Promote Pawn</h3>
        <p className="text-sm text-gray-400 mb-6">Choose a piece for promotion:</p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#2a2a2a] hover:bg-[#81b64c]/20 hover:border-[#81b64c] border border-transparent transition-all group"
            >
              <div className="w-12 h-12 transform group-hover:scale-110 transition-transform">
                <ChessPiece type={type} color={color} />
              </div>
              <span className="text-xs font-semibold text-gray-300 mt-2 group-hover:text-white">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

