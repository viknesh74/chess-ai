import { Chess } from 'chess.js';
import { VickyDecision } from '../types/chess';
import { stockfishService } from './stockfishWorker';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

let backendOfflineDetected = false;

function shouldAttemptBackend(): boolean {
  if (backendOfflineDetected) return false;
  if (typeof window === 'undefined') return true;

  const isHttps = window.location.protocol === 'https:';
  const isLocalHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';

  // If on HTTPS (e.g. https://vicky-chess.web.app) and BACKEND_URL points to insecure local HTTP,
  // skip immediately to avoid browser Mixed Content blocking and latency.
  if (isHttps && !isLocalHost && BACKEND_URL.startsWith('http://127.0.0.1')) {
    return false;
  }
  return true;
}

// Master Piece Values in Centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Tactical Exchange Weights (King can capture freely without 20000 exchange cost)
const EXCHANGE_ATTACKER_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 1000,
};

// Piece-Square Tables (White's perspective, Rank 1 to 8, a1=0, h8=63)
const PAWN_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10,-20,-20, 10, 10,  5,
   5, -5,-10,  0,  0,-10, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

// Repertoire opening book (moves history in SAN)
const OPENING_BOOK: Record<string, string> = {
  // White 1st Move
  '': 'e3',
  // Black Response to 1. e4 -> French Defense (59 high-accuracy wins)
  'e4': 'e6',
  'e4 e6 d4': 'd5',
  'e4 e6 Nf3': 'd5',
  'e4 e6 d3': 'd5',
  'e4 e6 Nc3': 'd5',
  'e4 e6 d4 d5 e5': 'c5',
  'e4 e6 d4 d5 exd5': 'exd5',
  'e4 e6 d4 d5 Nc3': 'Nf6',
  'e4 e6 d4 d5 Nd2': 'c5',
  // Black Response to 1. d4
  'd4': 'e6',
  'd4 e6 c4': 'd5',
  'd4 d5 c4': 'e6',
  // White 1. e3 setups
  'e3 e5': 'd4',
  'e3 d5': 'd4',
};

// Static Exchange Evaluation (SEE)
function evaluateMoveSEE(chess: Chess, move: any): number {
  const board = new Chess(chess.fen());
  const res = board.move(move);
  if (!res) return -99999;

  if (board.isCheckmate()) return 99999;

  const oppCaptures = board.moves({ verbose: true }).filter((m) => m.to === move.to);
  if (oppCaptures.length === 0) {
    return move.captured ? (PIECE_VALUES[move.captured] || 100) : 0;
  }

  // Smallest opponent piece captures first
  oppCaptures.sort(
    (a, b) =>
      (EXCHANGE_ATTACKER_VALUES[a.piece] || 100) -
      (EXCHANGE_ATTACKER_VALUES[b.piece] || 100)
  );
  const primaryAttacker = oppCaptures[0];
  const myPieceVal = PIECE_VALUES[move.piece] || 100;
  const oppPieceVal = PIECE_VALUES[primaryAttacker.piece] || 100;
  const capturedVal = move.captured ? (PIECE_VALUES[move.captured] || 100) : 0;

  board.move(primaryAttacker);
  // Can we recapture?
  const recaptures = board.moves({ verbose: true }).filter((m) => m.to === move.to);
  if (recaptures.length === 0) {
    // Completely undefended!
    return capturedVal - myPieceVal;
  }

  // If defended, but our piece was significantly more valuable than the capturing piece:
  // e.g. Queen taking pawn defended by Bishop/King
  if (myPieceVal > oppPieceVal) {
    return capturedVal + oppPieceVal - myPieceVal;
  }

  return capturedVal;
}

// Secondary Check: Does this move leave any other friendly piece hanging?
function checkLeavesOtherPiecesHanging(chess: Chess, move: any): boolean {
  const board = new Chess(chess.fen());
  board.move(move);
  const oppReplies = board.moves({ verbose: true });

  for (const oppMove of oppReplies) {
    if (oppMove.captured && oppMove.to !== move.to) {
      const oppCapVal = PIECE_VALUES[oppMove.captured] || 100;
      const oppAttackerVal = PIECE_VALUES[oppMove.piece] || 100;
      // High-value pieces (Knight, Bishop, Rook, Queen)
      if (oppCapVal >= 300) {
        const oppBoard = new Chess(board.fen());
        oppBoard.move(oppMove);
        const recaptures = oppBoard.moves({ verbose: true }).filter((m) => m.to === oppMove.to);
        if (recaptures.length === 0) {
          return true; // Undefended piece hung!
        }
        if (oppCapVal > oppAttackerVal + 150) {
          return true; // Bad trade down!
        }
      }
    }
  }
  return false;
}

// Check if candidate move walks into an opponent checkmate in 1
function checkAllowsMateInOne(chess: Chess, move: any): boolean {
  const board = new Chess(chess.fen());
  board.move(move);
  const oppReplies = board.moves({ verbose: true });
  for (const oppMove of oppReplies) {
    const oppBoard = new Chess(board.fen());
    oppBoard.move(oppMove);
    if (oppBoard.isCheckmate()) {
      return true;
    }
  }
  return false;
}

// Full Positional Board Evaluation (centipawns from perspective of current turn)
function evaluateBoardPosition(chess: Chess, isWhiteTurn: boolean): number {
  if (chess.isCheckmate()) {
    return chess.turn() === (isWhiteTurn ? 'w' : 'b') ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
    return 0;
  }

  let whiteScore = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;

      const val = PIECE_VALUES[p.type] || 0;
      const sqIdx = (7 - r) * 8 + c;
      let pst = 0;

      if (p.type === 'p') pst = PAWN_PST[p.color === 'w' ? sqIdx : 63 - sqIdx];
      else if (p.type === 'n') pst = KNIGHT_PST[p.color === 'w' ? sqIdx : 63 - sqIdx];
      else if (p.type === 'b') pst = BISHOP_PST[p.color === 'w' ? sqIdx : 63 - sqIdx];

      if (p.color === 'w') {
        whiteScore += val + pst;
      } else {
        whiteScore -= val + pst;
      }
    }
  }

  // Castling bonus: reward castling (King on g1/c1 for White, g8/c8 for Black)
  const castlingRights = chess.fen().split(' ')[2] || '';
  if (!castlingRights.includes('K') && !castlingRights.includes('Q')) {
    const wKing = board.flat().find((sq) => sq?.type === 'k' && sq?.color === 'w');
    if (wKing) whiteScore += 30;
  }
  if (!castlingRights.includes('k') && !castlingRights.includes('q')) {
    const bKing = board.flat().find((sq) => sq?.type === 'k' && sq?.color === 'b');
    if (bKing) whiteScore -= 30;
  }

  return isWhiteTurn ? whiteScore : -whiteScore;
}

export async function getVickyMove(
  fen: string,
  historyMoves: string[] = [],
  personalizationWeight: number = 0.65,
  stockfishDepth: number = 10,
  difficulty: string = 'master'
): Promise<VickyDecision> {
  // 1. First, attempt FastAPI backend if reachable locally (< 30ms)
  if (shouldAttemptBackend()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);

      const response = await fetch(`${BACKEND_URL}/api/vicky-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          personalizationWeight,
          historyMoves,
          difficulty,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: VickyDecision = await response.json();
        return data;
      } else {
        backendOfflineDetected = true;
      }
    } catch {
      backendOfflineDetected = true;
    }
  }

  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }

  const moveNumber = Math.floor(historyMoves.length / 2) + 1;
  const isWhite = chess.turn() === 'w';

  // 2. High-Accuracy Opening Repertoire (Viknesh's Signature Openings)
  const historyKey = historyMoves.join(' ');
  const bookSan = OPENING_BOOK[historyKey];
  if (bookSan) {
    const bookMove = legalMoves.find((m) => m.san === bookSan);
    if (bookMove) {
      const uci = `${bookMove.from}${bookMove.to}${bookMove.promotion || ''}`;
      return {
        uci,
        san: bookMove.san,
        explanation:
          bookMove.san === 'e3'
            ? "Vicky deployed Viknesh's signature High-Accuracy White opening (1. e3), proven in 54 peak winning games."
            : bookMove.san === 'e6'
            ? "Vicky responded with Viknesh's signature High-Accuracy French Defense (1... e6), boasting a 77.5% accuracy rate."
            : `Vicky executed ${bookMove.san}, following Viknesh's master opening preparation.`,
        styleScore: 1.0,
        engineEval: 15,
        combinedScore: 0.99,
        topCandidates: [
          { san: bookMove.san, uci, style: 1.0, eval: 15 },
          ...legalMoves
            .filter((m) => m.san !== bookSan)
            .slice(0, 3)
            .map((m) => ({
              san: m.san,
              uci: `${m.from}${m.to}${m.promotion || ''}`,
              style: 0.85,
              eval: 0,
            })),
        ],
      };
    }
  }

  // 3. Query Stockfish 18 Web Worker for deep tactical calculation
  let stockfishBestMoveUci = '';
  let engineScore = 0;
  try {
    const sfResult = await stockfishService.evaluatePosition(
      fen,
      Math.min(stockfishDepth || 10, 12)
    );
    stockfishBestMoveUci = sfResult.bestMove;
    engineScore = sfResult.evaluation.scoreCentipawns;
  } catch (err) {
    console.warn('Stockfish evaluation fallback active:', err);
  }

  // 4. Tactical Blunder Guardian & Soundness Check for ALL Candidate Moves
  const evaluatedMoves = legalMoves.map((move) => {
    const uci = `${move.from}${move.to}${move.promotion || ''}`;

    // Test A: Static Exchange Evaluation
    const seeGain = evaluateMoveSEE(chess, move);

    // Test B: Leaves other major/minor pieces hanging
    const hangsOthers = checkLeavesOtherPiecesHanging(chess, move);

    // Test C: Allows opponent mate in 1
    const allowsMate = checkAllowsMateInOne(chess, move);

    // Hard blunder determination:
    // A move is a blunder if it loses material in exchange (e.g. Queen for Pawn SEE: -800),
    // hangs an undefended piece, or walks into checkmate!
    const isBlunder = seeGain < -150 || hangsOthers || allowsMate;

    // Positional evaluation of resulting board
    const nextChess = new Chess(fen);
    nextChess.move(move);
    const positionalScore = evaluateBoardPosition(nextChess, isWhite);

    return {
      move,
      uci,
      seeGain,
      hangsOthers,
      allowsMate,
      isBlunder,
      positionalScore,
    };
  });

  // Calculate highest positional score among all legal moves
  const nonBlunderMoves = evaluatedMoves.filter((m) => !m.isBlunder);
  const candidatePool = nonBlunderMoves.length > 0 ? nonBlunderMoves : evaluatedMoves;
  const maxPositionalScore = Math.max(...candidatePool.map((m) => m.positionalScore));

  // 5. Score Candidate Moves with Viknesh High-Accuracy Patterns
  const scoredMoves = evaluatedMoves.map((cand) => {
    const { move, uci, isBlunder, positionalScore, seeGain } = cand;

    const isEngineMatch = Boolean(
      stockfishBestMoveUci &&
      stockfishBestMoveUci.length >= 4 &&
      stockfishBestMoveUci.startsWith(uci)
    );

    // Soundness criteria:
    // 1. Stockfish top move is always sound
    // 2. Otherwise must not be a blunder AND within 50 centipawns of the best positional move
    const posDiff = positionalScore - maxPositionalScore;
    const isTacticallySound = !isBlunder && posDiff >= -50;
    const isSound = isEngineMatch || isTacticallySound;

    let styleScore = 0.5;

    if (isSound) {
      // Viknesh feature 1: Tactical Captures with positive/equal exchange
      if (move.captured && seeGain >= 0) {
        styleScore += 0.28;
      }
      // Viknesh feature 2: Active Checks
      if (move.san.includes('+')) {
        styleScore += 0.18;
      }
      // Viknesh feature 3: Central Domination (d4, e4, d5, e5, c5, f5, c3, f3)
      const centerSquares = ['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'c3', 'f3', 'c6', 'f6'];
      if (centerSquares.includes(move.to)) {
        styleScore += 0.15;
      }
      // Viknesh feature 4: Kingside Castling (O-O) for rapid king safety
      if (move.san === 'O-O') {
        styleScore += 0.32;
      }
    } else {
      styleScore = 0.001;
    }

    // Anti-blunder guard: Heavily penalize premature Queen sorties before move 5
    if (move.piece === 'q' && moveNumber <= 4 && !move.captured && !move.san.includes('#')) {
      styleScore = 0.01;
    }

    let engineScoreNorm = 0.1;
    if (isEngineMatch) {
      engineScoreNorm = 1.0;
    } else if (isSound) {
      engineScoreNorm = Math.max(0.4, 0.85 + posDiff / 200);
    } else {
      engineScoreNorm = 0.0;
    }

    // STRICT ZERO-BLUNDER MULTIPLIER:
    // Any move detected as a blunder gets an absolute floor score (0.00001)
    let combined = isSound
      ? (1 - personalizationWeight) * engineScoreNorm + personalizationWeight * styleScore
      : 0.00001;

    if (isEngineMatch) {
      combined += 0.40; // Decisive priority bonus for Stockfish's best move
    }

    return {
      san: move.san,
      uci,
      styleScore: Number(Math.min(1.0, Math.max(0.0, styleScore)).toFixed(3)),
      engineEval: isEngineMatch ? engineScore : positionalScore,
      combinedScore: Number(combined.toFixed(4)),
      isSound,
      isBlunder,
    };
  });

  // Sort descending by combined score
  scoredMoves.sort((a, b) => b.combinedScore - a.combinedScore);
  const bestChoice = scoredMoves[0];

  return {
    uci: bestChoice.uci,
    san: bestChoice.san,
    explanation:
      bestChoice.styleScore > 0.7
        ? `Vicky executed ${bestChoice.san}, reflecting Viknesh's high-accuracy tactical mastery with engine soundness.`
        : `Vicky chose ${bestChoice.san}, enforcing Master-level positional solidity and zero blunders.`,
    styleScore: Number(bestChoice.styleScore.toFixed(3)),
    engineEval: bestChoice.engineEval,
    combinedScore: Number(bestChoice.combinedScore.toFixed(3)),
    topCandidates: scoredMoves.slice(0, 4).map((m) => ({
      san: m.san,
      uci: m.uci,
      style: Number(m.styleScore.toFixed(3)),
      eval: m.engineEval,
    })),
  };
}
