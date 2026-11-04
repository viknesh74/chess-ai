import React from 'react';

interface ChessPieceProps {
  type: string; // 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: 'w' | 'b';
  className?: string;
}

export const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, className = "w-full h-full" }) => {
  const isWhite = color === 'w';

  // Crisp standard SVG rendering for chess pieces
  switch (type.toLowerCase()) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 l 23,0 c 0,-7.92 -4.41,-12.41 -7.41,-13.47 C 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
            }}
          />
        </svg>
      );
    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <path d="m 22,10 c 10.5,1 16.5,8 16,29 L 15,39 C 15,30 11,26 8,16 c 7,0 12,2 14,8 C 22,20 22,13 22,10 z" />
            <path d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.04,-0.94 -1.41,-3.04 0,-3 1.5,0 3,1 2.5,-1.5 C 13,24 18,17 24,18 z" />
            <circle cx="16" cy="18" r="1.5" style={{ fill: isWhite ? '#1b1b1b' : '#ffffff' }} />
          </g>
        </svg>
      );
    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <path d="m 9,36 c 3.39,-0.97 10.11,0.43 13.5,-2 3.39,2.43 10.11,1.03 13.5,2 0,0 1.65,0.54 3,2 -0.68,0.97 -1.65,0.99 -3,1 -3.39,-0.21 -10.11,0.86 -13.5,-1 -3.39,1.86 -10.11,0.79 -13.5,1 -1.35,-0.01 -2.32,-0.03 -3,-1 1.35,-1.46 3,-2 3,-2 z" />
            <path d="m 15,32 c 2.5,2.5 12.5,2.5 15,0 0.5,-1.5 0,-2 0,-2 0,-2.5 -2.5,-4 -2.5,-4 5.5,-1.5 6,-11.5 -5,-15.5 -11,4 -10.5,14 -5,15.5 0,0 -2.5,1.5 -2.5,4 0,0 -0.5,0.5 0,2 z" />
            <path d="m 25,8 a 2.5,2.5 0 1 1 -5,0 2.5,2.5 0 1 1 5,0 z" />
            <path d="m 17.5,26 c 0,0 2.5,-2 5,-2 2.5,0 5,2 5,2" style={{ fill: 'none' }} />
          </g>
        </svg>
      );
    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <path d="m 9,39 27,0 c 0,-3 -2.5,-4 -4,-4.5 L 32,14 36,11 36,9 31,9 31,11 29,11 29,9 25,9 25,11 23,11 23,9 19,9 19,11 17,11 17,9 12,9 12,11 16,14 16,30.5 C 14.5,31 12,32 9,35 l 0,4 z" />
            <path d="m 14,29.5 17,0" style={{ fill: 'none' }} />
            <path d="m 14,16.5 17,0" style={{ fill: 'none' }} />
          </g>
        </svg>
      );
    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <path d="M 8.5,14 A 2.5,2.5 0 1 1 3.5,14 2.5,2.5 0 1 1 8.5,14 Z" />
            <path d="M 17.5,10.5 A 2.5,2.5 0 1 1 12.5,10.5 2.5,2.5 0 1 1 17.5,10.5 Z" />
            <path d="M 25,9 A 2.5,2.5 0 1 1 20,9 2.5,2.5 0 1 1 25,9 Z" />
            <path d="M 32.5,10.5 A 2.5,2.5 0 1 1 27.5,10.5 2.5,2.5 0 1 1 32.5,10.5 Z" />
            <path d="M 41.5,14 A 2.5,2.5 0 1 1 36.5,14 2.5,2.5 0 1 1 41.5,14 Z" />
            <path d="m 9,26 c 8.5,-1.5 21,-1.5 27,0 l 2,-12 -7,11 -8.5,-14 -8.5,14 -7,-11 2,12 z" />
            <path d="m 9,26 c 0,2 1.5,2 2.5,4 2.5,4 4.5,6 11,6 6.5,0 8.5,-2 11,-6 1,-2 2.5,-2 2.5,-4 0,-1.5 0.5,-1.5 0,-2 -6,-1.5 -18.5,-1.5 -27,0 -0.5,0.5 0,0.5 0,2 z" />
            <path d="M 11.5,30 C 15,29 30,29 33.5,30" style={{ fill: 'none' }} />
            <path d="M 12,33.5 C 16,32.5 29,32.5 33,33.5" style={{ fill: 'none' }} />
            <path d="M 10.5,39.5 L 34.5,39.5" />
          </g>
        </svg>
      );
    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g
            style={{
              fill: isWhite ? '#ffffff' : '#1b1b1b',
              stroke: isWhite ? '#1b1b1b' : '#ffffff',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <path d="M 22.5,11.5 L 22.5,4.5" style={{ fill: 'none' }} />
            <path d="M 19,8 L 26,8" style={{ fill: 'none' }} />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
            <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 37,27 34,20 22.5,20 C 11,20 8,27 11.5,37 Z" />
            <path d="M 11.5,30 C 17,27 28,27 33.5,30" style={{ fill: 'none' }} />
            <path d="M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5" style={{ fill: 'none' }} />
            <path d="M 10.5,39.5 L 34.5,39.5" />
          </g>
        </svg>
      );
    default:
      return null;
  }
};

