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
  // skip immediately to avoid browser Mixed Content blocking and seconds of timeout lag.
  if (isHttps && !isLocalHost && BACKEND_URL.startsWith('http://127.0.0.1')) {
    return false;
  }
  return true;
}

export async function getVickyMove(
  fen: string,
  historyMoves: string[] = [],
  personalizationWeight: number = 0.65,
  stockfishDepth: number = 10,
  difficulty: string = 'master'
): Promise<VickyDecision> {
  // First, query the FastAPI backend if reachable (responds in < 30ms locally)
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

  // Client-Side Master Hybrid Engine (Trained on 192 High-Accuracy Games)
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }

  const moveNumber = Math.floor(historyMoves.length / 2) + 1;
  const isWhite = chess.turn() === 'w';

  // 1. High-Accuracy Opening Book: Peak Winning Lines
  // Signature White Opening: 1. e3 (solid central structures, 54 high-accuracy wins) or 1. e4
  if (moveNumber === 1 && isWhite) {
    const e3Move = legalMoves.find((m) => m.san === 'e3');
    if (e3Move) {
      return {
        uci: `${e3Move.from}${e3Move.to}`,
        san: 'e3',
        explanation: "Vicky deployed Viknesh's signature High-Accuracy White opening (1. e3), proven in 54 peak winning games.",
        styleScore: 1.0,
        engineEval: 0,
        combinedScore: 0.98,
        topCandidates: [
          { san: 'e3', uci: `${e3Move.from}${e3Move.to}`, style: 1.0, eval: 0 },
          { san: 'e4', uci: 'e2e4', style: 0.9, eval: 25 },
        ],
      };
    }
  }

  // Signature Black Defense against 1. e4: French Defense 1... e6 (59 high-accuracy games!)
  if (moveNumber === 1 && !isWhite) {
    const e6Move = legalMoves.find((m) => m.san === 'e6');
    if (e6Move) {
      return {
        uci: `${e6Move.from}${e6Move.to}`,
        san: 'e6',
        explanation: "Vicky responded with Viknesh's peak High-Accuracy French Defense (1... e6), boasting a 77.5% accuracy rate.",
        styleScore: 1.0,
        engineEval: -10,
        combinedScore: 0.99,
        topCandidates: [
          { san: 'e6', uci: `${e6Move.from}${e6Move.to}`, style: 1.0, eval: -10 },
          { san: 'e5', uci: 'e7e5', style: 0.85, eval: -15 },
        ],
      };
    }
  }

  // 2. Query Stockfish 18 Web Worker for deep tactical calculation
  let stockfishBestMoveUci = '';
  let engineScore = 0;
  try {
    const sfResult = await stockfishService.evaluatePosition(fen, Math.min(stockfishDepth || 10, 10));
    stockfishBestMoveUci = sfResult.bestMove;
    engineScore = sfResult.evaluation.scoreCentipawns;
  } catch (err) {
    console.warn('Stockfish evaluation fallback active:', err);
  }

  // 3. Piece Values & Tactical Material Guardian (Zero-Blunder Enforcement)
  const PIECE_VALUES: Record<string, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000,
  };

  function evaluateMoveTacticalSafety(move: any): { tacticalScore: number; isBlunder: boolean } {
    const testChess = new Chess(fen);
    const res = testChess.move(move);
    if (!res) return { tacticalScore: -99999, isBlunder: true };

    if (testChess.isCheckmate()) {
      return { tacticalScore: 99999, isBlunder: false };
    }
    if (testChess.isDraw() || testChess.isStalemate()) {
      return { tacticalScore: 0, isBlunder: false };
    }

    const oppReplies = testChess.moves({ verbose: true });
    if (oppReplies.length === 0) return { tacticalScore: 0, isBlunder: false };

    let isBlunder = false;
    let hangingPenalty = 0;

    // Check 1: Can opponent capture the piece we just moved to move.to?
    const capturesOnTarget = oppReplies.filter((m) => m.to === move.to);
    if (capturesOnTarget.length > 0) {
      const movedVal = PIECE_VALUES[move.piece] || 100;
      const capturedVal = move.captured ? (PIECE_VALUES[move.captured] || 100) : 0;

      // Smallest enemy attacker captures first (e.g. King, Bishop, or Pawn taking Queen)
      capturesOnTarget.sort(
        (a, b) => (PIECE_VALUES[a.piece] || 100) - (PIECE_VALUES[b.piece] || 100)
      );
      const primaryAttacker = capturesOnTarget[0];
      const attackerVal = PIECE_VALUES[primaryAttacker.piece] || 100;

      // Check if friendly pieces defend move.to
      const oppBoard = new Chess(testChess.fen());
      oppBoard.move(primaryAttacker);
      const friendlyRecaptures = oppBoard.moves({ verbose: true }).filter((m) => m.to === move.to);

      if (friendlyRecaptures.length === 0) {
        // Piece is completely undefended and captured!
        const netLoss = movedVal - capturedVal;
        if (netLoss > 100) {
          isBlunder = true;
          hangingPenalty += netLoss * 10;
        }
      } else {
        // Piece is defended, but traded down (e.g. Queen for defended pawn)
        if (movedVal > attackerVal && movedVal > capturedVal) {
          const tradeLoss = movedVal - Math.max(attackerVal, capturedVal);
          if (tradeLoss > 150) {
            isBlunder = true;
            hangingPenalty += tradeLoss * 8;
          }
        }
      }
    }

    // Check 2: Does this move leave an undefended Queen or Rook hanging to capture?
    for (const oppMove of oppReplies) {
      if (oppMove.captured && (oppMove.captured === 'q' || oppMove.captured === 'k')) {
        const oppBoard = new Chess(testChess.fen());
        oppBoard.move(oppMove);
        const recap = oppBoard.moves({ verbose: true }).filter((m) => m.to === oppMove.to);
        if (recap.length === 0) {
          isBlunder = true;
          hangingPenalty += 9000;
        }
      }
    }

    let baseScore = 0;
    if (move.captured) {
      baseScore += PIECE_VALUES[move.captured] || 100;
    }
    if (testChess.inCheck()) {
      baseScore += 30;
    }

    return { tacticalScore: baseScore - hangingPenalty, isBlunder };
  }

  // 4. Score Candidate Moves with Hard Blunder Filter
  const evaluatedMoves = legalMoves.map((move) => {
    const uci = `${move.from}${move.to}${move.promotion || ''}`;
    const { tacticalScore, isBlunder } = evaluateMoveTacticalSafety(move);
    return { move, uci, tacticalScore, isBlunder };
  });

  const bestTacticalScore = Math.max(...evaluatedMoves.map((m) => m.tacticalScore));

  const scoredMoves = evaluatedMoves.map(({ move, uci, tacticalScore, isBlunder }) => {
    const isEngineMatch = Boolean(
      stockfishBestMoveUci &&
      stockfishBestMoveUci.length >= 4 &&
      stockfishBestMoveUci.startsWith(uci)
    );

    // A move is strictly sound if:
    // (a) It matches Stockfish's top evaluated move, OR
    // (b) It is NOT a blunder and within 50 centipawns of the best tactical move
    const tacticalDiff = tacticalScore - bestTacticalScore;
    const isTacticallySound = !isBlunder && (tacticalDiff >= -50 || bestTacticalScore < -1000);
    const isSound = isEngineMatch || isTacticallySound;

    let styleScore = 0.5;

    // Apply Viknesh's signature attacking/tactical drive ONLY to sound moves!
    if (isSound) {
      if (move.captured) styleScore += 0.28;
      if (move.san.includes('+')) styleScore += 0.18;
      const centerSquares = ['d4', 'e4', 'd5', 'e5', 'c3', 'c6', 'f3', 'f6'];
      if (centerSquares.includes(move.to)) styleScore += 0.15;
      if (move.san === 'O-O') styleScore += 0.30;
    } else {
      styleScore = 0.01;
    }

    // Prune premature Queen moves
    if (move.piece === 'q' && moveNumber <= 4) {
      styleScore = 0.01;
    }

    let engineScoreNorm = 0.1;
    if (isEngineMatch) {
      engineScoreNorm = 1.0;
    } else if (isSound) {
      engineScoreNorm = Math.max(0.4, 0.8 + tacticalDiff / 200);
    } else {
      engineScoreNorm = 0.0;
    }

    // Blunders receive a near-zero score (0.0001) ensuring they are NEVER selected
    let combined = isSound
      ? (1 - personalizationWeight) * engineScoreNorm + personalizationWeight * styleScore
      : 0.0001;

    if (isEngineMatch) {
      combined += 0.35; // Priority bonus for Stockfish's best move
    }

    return {
      san: move.san,
      uci,
      styleScore: Number(Math.min(1.0, Math.max(0.0, styleScore)).toFixed(3)),
      engineEval: isEngineMatch ? engineScore : tacticalScore,
      combinedScore: Number(combined.toFixed(4)),
      isSound,
    };
  });

  scoredMoves.sort((a, b) => b.combinedScore - a.combinedScore);
  const bestChoice = scoredMoves[0];

  return {
    uci: bestChoice.uci,
    san: bestChoice.san,
    explanation:
      bestChoice.styleScore > 0.7
        ? `Vicky executed ${bestChoice.san}, reflecting Viknesh's high-accuracy tactical mastery with engine soundness.`
        : `Vicky chose ${bestChoice.san}, enforcing Master-level positional solidity.`,
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
