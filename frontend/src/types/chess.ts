export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type BoardTheme = 'green' | 'wood' | 'ocean' | 'classic';

export interface UserProfile {
  name: string;
  username: string;
  rating: number;
  avatar: string;
  title?: string;
  registeredAt?: string;
}

export interface SquareCoord {
  square: string; // e.g. "e4"
  file: number;   // 0-7
  rank: number;   // 0-7
}

export interface CandidateMove {
  san: string;
  uci: string;
  style: number;
  eval: number;
}

export interface VickyDecision {
  uci: string;
  san: string;
  explanation: string;
  styleScore: number;
  engineEval: number;
  combinedScore: number;
  topCandidates?: CandidateMove[];
}

export interface GameRecord {
  id: number | string;
  userName?: string;
  date: string;
  white: string;
  black: string;
  whiteElo?: string;
  blackElo?: string;
  result: string;
  outcome?: string;
  userColor: 'white' | 'black';
  timeControl: string;
  termination?: string;
  opening: string;
  eco?: string;
  moveCount: number;
  sanHistory: string[];
  uciHistory: string[];
  finalFen: string;
  pgn?: string;
}

export interface GameSettings {
  personalizationWeight: number; // 0.0 to 1.0 (default 0.65)
  stockfishDepth: number;         // 6 to 18 (default 14)
  difficulty: 'master' | 'hard' | 'standard'; // default master
  boardTheme: BoardTheme;
  soundEnabled: boolean;
  autoFlip: boolean;
  playerColor: 'w' | 'b' | 'random';
}

export interface HighAccuracyProfile {
  totalGamesAnalyzed: number;
  highAccuracyGamesCount: number;
  highAccuracyPercentage: number;
  avgHighAccuracyScore: number;
  avgHighCentipawnLoss: number;
  highAccuracyWins: number;
  highAccuracyWinRate: number;
  topHighAccuracyOpenings: Array<{ opening: string; count: number }>;
  highAccuracyGamesSample: Array<{
    id: number;
    date: string;
    white: string;
    black: string;
    result: string;
    accuracy: number;
    cpl: number;
    opening: string;
    moveCount: number;
    termination: string;
  }>;
}

export interface PlayerProfile {
  datasetInfo: {
    totalGamesParsed: number;
    parseErrorsCount: number;
    parseErrors: string[];
    sourceFile: string;
  };
  player: {
    name: string;
    username: string;
  };
  overview: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    lossRate: number;
    drawRate: number;
    whiteGames: number;
    blackGames: number;
    whiteStats: {
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
    };
    blackStats: {
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
    };
    averageGameLengthPlies: number;
    averageGameLengthFullMoves: number;
  };
  openings: {
    topOpenings: Array<{
      name: string;
      played: number;
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
    }>;
    firstMovesWhite: Array<{ move: string; count: number }>;
    firstMovesBlack: Array<{ move: string; count: number }>;
    topEco: Array<{ eco: string; count: number }>;
  };
  castling: {
    kingside: number;
    queenside: number;
    none: number;
    averageCastlingMove: number;
    kingsidePercentage: number;
    queensidePercentage: number;
    uncastledPercentage: number;
  };
  pieceActivity: Array<{ piece: string; moves: number }>;
  tactics: {
    checks_given: number;
    checks_received: number;
    captures_made: number;
    captures_received: number;
    promotions_made: number;
    checkmates_delivered: number;
    checkmates_suffered: number;
  };
  terminations: Array<{ reason: string; count: number }>;
  mistakes: Array<{ type: string; count: number }>;
  recentGames: GameRecord[];
  allGames: GameRecord[];
}

export interface VickyModelReport {
  status: string;
  modelType: string;
  totalGamesDataset: number;
  trainGamesCount: number;
  valGamesCount: number;
  trainPositionsSampled: number;
  valPositionsSampled: number;
  metrics: {
    validationAuc: number;
    binaryAccuracy: number;
    top1MoveRankAccuracy: number;
    top3MoveRankAccuracy: number;
    precision: number;
    recall: number;
  };
  featureImportances: Array<{ feature: string; importance: number }>;
  styleFindings: string[];
}

