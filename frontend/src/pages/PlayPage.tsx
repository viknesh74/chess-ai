import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Flag,
  Handshake,
  RotateCw,
  PlusCircle,
  Play,
  Volume2,
  VolumeX,
  Trophy,
  AlertTriangle,
  Brain,
  Shield,
  Clock as ClockIcon,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Chessboard } from '../components/Chessboard';
import { Clock } from '../components/Clock';
import { EvaluationBar } from '../components/EvaluationBar';
import { MoveHistory } from '../components/MoveHistory';
import { VickyThoughtCard } from '../components/VickyThoughtCard';
import { getVickyMove } from '../utils/vickyClientEngine';
import { stockfishService } from '../utils/stockfishWorker';
import { sounds } from '../utils/sound';
import { BoardTheme, GameSettings, VickyDecision, GameRecord, UserProfile } from '../types/chess';
import { dbSaveMatch } from '../utils/dbApi';

const LOCAL_STORAGE_GAME_KEY = 'vicky_chess_active_game_state_v1';
const SAVED_GAMES_STORAGE_KEY = 'vicky_chess_user_games_v1';

const getUserGameKey = (user?: UserProfile | null) => {
  if (!user?.name) return 'vicky_chess_active_game_guest';
  return `vicky_chess_active_game_${user.name.toLowerCase().trim().replace(/\s+/g, '_')}`;
};

interface PlayPageProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onGameCompleted?: (game: GameRecord) => void;
  currentUser?: UserProfile | null;
  onBack?: () => void;
  onNavigateHistory?: (gameId?: string | number) => void;
}

export const PlayPage: React.FC<PlayPageProps> = ({
  settings,
  onUpdateSettings,
  onGameCompleted,
  currentUser,
  onBack,
  onNavigateHistory,
}) => {
  const playerName = currentUser?.name || 'Player';

  const clearUserActiveGame = () => {
    const key = getUserGameKey(currentUser);
    localStorage.removeItem(key);
    localStorage.removeItem(LOCAL_STORAGE_GAME_KEY);
  };
  // Game instance
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [isFlipped, setIsFlipped] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Time control: 10 minutes (600 seconds)
  const [playerTime, setPlayerTime] = useState(600);
  const [vickyTime, setVickyTime] = useState(600);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw' | null>(null);

  const gameOverRef = useRef(false);
  const gameStartedRef = useRef(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  // AI & Evaluation state
  const [isVickyThinking, setIsVickyThinking] = useState(false);
  const [vickyDecision, setVickyDecision] = useState<VickyDecision | null>(null);
  const [scoreCentipawns, setScoreCentipawns] = useState(0);

  // Move navigation in history
  const [sanMoves, setSanMoves] = useState<string[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [historyFens, setHistoryFens] = useState<string[]>([]);

  // Player Color (default White)
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [mobilePanel, setMobilePanel] = useState<'mind' | 'moves'>('mind');

  // Eagerly pre-warm Stockfish 18 Web Worker on page mount for instant, zero-blunder calculation
  useEffect(() => {
    stockfishService.init().catch(() => {});
  }, []);

  // Load persistent game state per user (resets if new account has no game)
  useEffect(() => {
    // 1. Immediately tear down any active timer from previous account
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const userKey = getUserGameKey(currentUser);
    try {
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data && !data.gameOver && data.fen) {
          const loadedChess = new Chess(data.fen);
          setChess(loadedChess);
          setPlayerTime(data.playerTime ?? 600);
          setVickyTime(data.vickyTime ?? 600);
          setGameStarted(data.gameStarted ?? false);
          setPlayerColor(data.playerColor || 'w');
          setSanMoves(data.sanMoves || []);
          setCurrentMoveIdx((data.sanMoves || []).length - 1);
          setHistoryFens(data.historyFens || [new Chess().fen()]);
          setLastMove(data.lastMove || null);
          setVickyDecision(data.vickyDecision || null);
          setScoreCentipawns(data.scoreCentipawns || 0);
          setGameOver(false);
          setShowGameOverModal(false);
          setGameOverReason(null);
          setGameResult(null);
          gameOverRef.current = false;
          gameStartedRef.current = data.gameStarted ?? false;
          return;
        }
      }
    } catch (e) {
      console.warn('Error loading per-user game state:', e);
    }

    // 2. If no saved active game exists for this user account, start a brand NEW game!
    const fresh = new Chess();
    setChess(fresh);
    setPlayerTime(600);
    setVickyTime(600);
    setGameStarted(false);
    setGameOver(false);
    setShowGameOverModal(false);
    setGameOverReason(null);
    setGameResult(null);
    setSanMoves([]);
    setCurrentMoveIdx(-1);
    setHistoryFens([fresh.fen()]);
    setLastMove(null);
    setVickyDecision(null);
    setScoreCentipawns(0);
    gameOverRef.current = false;
    gameStartedRef.current = false;
  }, [currentUser?.name]);

  // Save active game state per user
  useEffect(() => {
    if (gameStarted && !gameOver) {
      try {
        const userKey = getUserGameKey(currentUser);
        const state = {
          fen: chess.fen(),
          playerTime,
          vickyTime,
          gameStarted,
          playerColor,
          sanMoves,
          historyFens,
          lastMove,
          vickyDecision,
          scoreCentipawns,
          gameOver,
          playerName,
        };
        localStorage.setItem(userKey, JSON.stringify(state));
      } catch {
        // ignore
      }
    }
  }, [
    currentUser?.name,
    chess,
    playerTime,
    vickyTime,
    gameStarted,
    playerColor,
    sanMoves,
    historyFens,
    lastMove,
    vickyDecision,
    scoreCentipawns,
    gameOver,
    playerName,
  ]);

  // Clocks countdown effect (accurate 100ms interval for precision)
  useEffect(() => {
    if (!gameStarted || gameOver || chess.isGameOver()) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      if (!gameStartedRef.current || gameOverRef.current) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const turn = chess.turn();
      const isPlayerTurn = turn === playerColor;

      if (isPlayerTurn) {
        setPlayerTime((prev) => {
          if (prev <= 0.1) {
            setTimeout(() => handleTimeout(playerColor), 0);
            return 0;
          }
          return Math.max(0, Number((prev - 0.1).toFixed(1)));
        });
      } else {
        setVickyTime((prev) => {
          if (prev <= 0.1) {
            setTimeout(() => handleTimeout(playerColor === 'w' ? 'b' : 'w'), 0);
            return 0;
          }
          return Math.max(0, Number((prev - 0.1).toFixed(1)));
        });
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStarted, gameOver, chess, playerColor]);

  const triggerWinConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const recordCompletedGame = (outcome: 'win' | 'loss' | 'draw', reason: string, moves: string[]) => {
    try {
      const matchHistoryStr = localStorage.getItem('vicky_live_match_history');
      const existing: GameRecord[] = matchHistoryStr ? JSON.parse(matchHistoryStr) : [];
      
      const activeUsername = currentUser?.username || (currentUser?.name ? currentUser.name.toLowerCase().replace(/\s+/g, '_') : playerName.toLowerCase().replace(/\s+/g, '_'));
      const displayName = currentUser?.name || playerName;

      const newRecord: GameRecord = {
        id: `match_${Date.now()}`,
        userName: activeUsername,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        white: playerColor === 'w' ? `${displayName} (You)` : (settings.playLikeViknesh ? 'Viknesh (Human Mirror)' : 'VICKY AI (Master)'),
        black: playerColor === 'b' ? `${displayName} (You)` : (settings.playLikeViknesh ? 'Viknesh (Human Mirror)' : 'VICKY AI (Master)'),
        whiteElo: playerColor === 'w' ? String(currentUser?.rating || '1200') : (settings.playLikeViknesh ? '1500' : '2200'),
        blackElo: playerColor === 'b' ? String(currentUser?.rating || '1200') : (settings.playLikeViknesh ? '1500' : '2200'),
        result: outcome === 'win' ? '1-0' : outcome === 'loss' ? '0-1' : '1/2-1/2',
        outcome,
        userColor: playerColor === 'w' ? 'white' : 'black',
        timeControl: '10+0 Rapid',
        termination: reason,
        opening: moves.length > 1 ? (moves[0] === 'e4' && moves[1] === 'e6' ? 'French Defense' : `${moves[0]} ${moves[1]}`) : '10+0 Rapid Match',
        moveCount: moves.length,
        sanHistory: moves,
        uciHistory: [],
        finalFen: chess.fen(),
      };

      const updated = [newRecord, ...existing];
      localStorage.setItem('vicky_live_match_history', JSON.stringify(updated));
      dbSaveMatch(newRecord).catch((err) => console.warn('Could not save match to SQLite DB:', err));
      if (onGameCompleted) {
        onGameCompleted(newRecord);
      }
    } catch (e) {
      console.warn('Could not save live game:', e);
    }
  };

  // Handle Timeout
  const handleTimeout = (timedOutColor: 'w' | 'b') => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    gameStartedRef.current = false;
    setGameOver(true);
    setGameStarted(false);
    setShowGameOverModal(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    clearUserActiveGame();

    const isPlayerTimedOut = timedOutColor === playerColor;
    const opponentHasMaterial = !chess.isInsufficientMaterial();

    let outcome: 'win' | 'loss' | 'draw' = 'draw';
    let reason = '';

    if (!opponentHasMaterial) {
      outcome = 'draw';
      reason = 'Draw by Timeout vs Insufficient Material';
    } else if (isPlayerTimedOut) {
      outcome = 'loss';
      reason = `${playerName} lost on time.`;
    } else {
      outcome = 'win';
      reason = 'Vicky AI lost on time.';
      triggerWinConfetti();
    }

    setGameResult(outcome);
    setGameOverReason(reason);
    recordCompletedGame(outcome, reason, sanMoves);
    sounds.playGameOver();
  };

  // Check Game Over Conditions
  const checkGameOverConditions = (currentChess: Chess, currentSanMoves: string[]) => {
    if (currentChess.isCheckmate()) {
      const winner = currentChess.turn() === 'w' ? 'b' : 'w';
      const isPlayerWin = winner === playerColor;
      const outcome: 'win' | 'loss' = isPlayerWin ? 'win' : 'loss';
      const reason = isPlayerWin
        ? `Checkmate! ${playerName} won by checkmate.`
        : 'Checkmate! Vicky AI delivered checkmate.';
      gameOverRef.current = true;
      gameStartedRef.current = false;
      setGameOver(true);
      setGameStarted(false);
      setShowGameOverModal(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameResult(outcome);
      setGameOverReason(reason);
      if (isPlayerWin) triggerWinConfetti();
      sounds.playGameOver();
      clearUserActiveGame();
      recordCompletedGame(outcome, reason, currentSanMoves);
      return true;
    }

    if (currentChess.isDraw()) {
      gameOverRef.current = true;
      gameStartedRef.current = false;
      setGameOver(true);
      setGameStarted(false);
      setShowGameOverModal(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameResult('draw');
      let reason = 'Draw by 50-move rule.';
      if (currentChess.isStalemate()) {
        reason = 'Draw by Stalemate.';
      } else if (currentChess.isThreefoldRepetition()) {
        reason = 'Draw by Threefold Repetition.';
      } else if (currentChess.isInsufficientMaterial()) {
        reason = 'Draw by Insufficient Material.';
      }
      setGameOverReason(reason);
      sounds.playGameOver();
      clearUserActiveGame();
      recordCompletedGame('draw', reason, currentSanMoves);
      return true;
    }

    return false;
  };

  // User Move Handler
  const handleUserMove = async (moveObj: { from: string; to: string; promotion?: string }) => {
    if (gameOver || isVickyThinking) return;
    if (chess.turn() !== playerColor) return;

    try {
      const newChess = new Chess(chess.fen());
      const res = newChess.move({
        from: moveObj.from,
        to: moveObj.to,
        promotion: moveObj.promotion || 'q',
      });

      if (!res) return;

      // Play appropriate sound
      if (res.flags.includes('k') || res.flags.includes('q')) {
        sounds.playCastle();
      } else if (res.captured) {
        sounds.playCapture();
      } else if (newChess.inCheck()) {
        sounds.playCheck();
      } else {
        sounds.playMove();
      }

      setChess(newChess);
      setLastMove({ from: moveObj.from, to: moveObj.to });

      const newSanMoves = [...sanMoves, res.san];
      setSanMoves(newSanMoves);
      setCurrentMoveIdx(newSanMoves.length - 1);
      setHistoryFens([...historyFens, newChess.fen()]);

      if (!gameStarted) {
        setGameStarted(true);
      }

      const isOver = checkGameOverConditions(newChess, newSanMoves);
      if (isOver) return;

      // Trigger Vicky's Turn
      triggerVickyTurn(newChess, newSanMoves);
    } catch (err) {
      console.warn('Move execution error:', err);
    }
  };

  // Vicky AI Turn
  const triggerVickyTurn = async (currentChess: Chess, movesHistory: string[]) => {
    setIsVickyThinking(true);

    // Quick, natural human-like thinking delay (200ms to 400ms)
    const delay = Math.floor(Math.random() * 200) + 200;
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const decision = await getVickyMove(
        currentChess.fen(),
        movesHistory,
        settings.playLikeViknesh ? 1.0 : settings.personalizationWeight,
        settings.stockfishDepth,
        settings.playLikeViknesh ? 'viknesh' : (settings.difficulty || 'master'),
        Boolean(settings.playLikeViknesh)
      );

      setVickyDecision(decision);
      setScoreCentipawns(decision.engineEval || 0);

      // Execute Vicky's Move on the board
      const newChess = new Chess(currentChess.fen());
      const fromSq = decision.uci.slice(0, 2) as Square;
      const toSq = decision.uci.slice(2, 4) as Square;
      const promo = decision.uci.length > 4 ? decision.uci[4] : 'q';

      const res = newChess.move({
        from: fromSq,
        to: toSq,
        promotion: promo,
      });

      if (res) {
        if (res.flags.includes('k') || res.flags.includes('q')) {
          sounds.playCastle();
        } else if (res.captured) {
          sounds.playCapture();
        } else if (newChess.inCheck()) {
          sounds.playCheck();
        } else {
          sounds.playMove();
        }

        setChess(newChess);
        setLastMove({ from: fromSq, to: toSq });

        const updatedSan = [...movesHistory, res.san];
        setSanMoves(updatedSan);
        setCurrentMoveIdx(updatedSan.length - 1);
        setHistoryFens((prev) => [...prev, newChess.fen()]);

        checkGameOverConditions(newChess, updatedSan);
      }
    } catch (e) {
      console.error('Vicky move error:', e);
    } finally {
      setIsVickyThinking(false);
    }
  };

  // Resignation
  const handleResign = () => {
    if (gameOver || !gameStarted) return;
    if (window.confirm('Are you sure you want to resign the game?')) {
      const reason = `${playerName} resigned.`;
      gameOverRef.current = true;
      gameStartedRef.current = false;
      setGameOver(true);
      setGameStarted(false);
      setShowGameOverModal(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameResult('loss');
      setGameOverReason(reason);
      clearUserActiveGame();
      recordCompletedGame('loss', reason, sanMoves);
      sounds.playGameOver();
    }
  };

  // Offer Draw
  const handleOfferDraw = () => {
    if (gameOver || !gameStarted) return;
    // Vicky evaluates draw offer based on current engine position
    if (Math.abs(scoreCentipawns) < 80) {
      alert('Vicky AI accepted your draw offer!');
      const reason = 'Draw agreed by mutual agreement.';
      gameOverRef.current = true;
      gameStartedRef.current = false;
      setGameOver(true);
      setGameStarted(false);
      setShowGameOverModal(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setGameResult('draw');
      setGameOverReason(reason);
      clearUserActiveGame();
      recordCompletedGame('draw', reason, sanMoves);
      sounds.playGameOver();
    } else {
      alert('Vicky AI declined the draw offer: "My position is too active to agree to a draw!"');
    }
  };

  // New Game / Generate New Board
  const handleNewGame = () => {
    clearUserActiveGame();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    gameOverRef.current = false;
    gameStartedRef.current = false;
    const fresh = new Chess();
    setChess(fresh);
    setPlayerTime(600);
    setVickyTime(600);
    setGameStarted(false);
    setGameOver(false);
    setShowGameOverModal(false);
    setGameOverReason(null);
    setGameResult(null);
    setSanMoves([]);
    setCurrentMoveIdx(-1);
    setHistoryFens([fresh.fen()]);
    setLastMove(null);
    setVickyDecision(null);
    setScoreCentipawns(0);
    sounds.playMove();
  };

  // Move history navigation
  const handleSelectHistoryMove = (idx: number) => {
    setCurrentMoveIdx(idx);
    const targetFen = historyFens[idx + 1] || historyFens[0];
    setChess(new Chess(targetFen));
  };

  const handleFirstMove = () => {
    setCurrentMoveIdx(-1);
    setChess(new Chess(historyFens[0]));
  };

  const handlePrevMove = () => {
    if (currentMoveIdx >= 0) {
      const prevIdx = currentMoveIdx - 1;
      setCurrentMoveIdx(prevIdx);
      setChess(new Chess(historyFens[prevIdx + 1] || historyFens[0]));
    }
  };

  const handleNextMove = () => {
    if (currentMoveIdx < sanMoves.length - 1) {
      const nextIdx = currentMoveIdx + 1;
      setCurrentMoveIdx(nextIdx);
      setChess(new Chess(historyFens[nextIdx + 1]));
    }
  };

  const handleLastMove = () => {
    setCurrentMoveIdx(sanMoves.length - 1);
    setChess(new Chess(historyFens[historyFens.length - 1]));
  };

  const isUserTurn = chess.turn() === playerColor && !gameOver;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-6 space-y-3 sm:space-y-6 animate-fade-in">
      {/* Top Match Info Header - Ultra Clean & Responsive */}
      <div className="flex items-center justify-between gap-2 bg-[#1e1e1e] border border-[#2c2c30] p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#27272a] hover:bg-[#333] text-gray-200 hover:text-white text-xs font-bold border border-[#38383e] transition-all transform active:scale-95 shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#81b64c]" />
              <span className="hidden xs:inline">Back</span>
            </button>
          )}

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-md shrink-0">
            ♟
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs sm:text-base font-extrabold text-white truncate max-w-[85px] sm:max-w-none">
                {playerName.toUpperCase()}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase">vs</span>
              <span className="text-xs sm:text-base font-extrabold text-[#81b64c]">
                {settings.playLikeViknesh ? 'VIKNESH (MIRROR)' : 'VICKY AI'}
              </span>
              <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                settings.playLikeViknesh
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60'
                  : 'bg-red-950/80 text-red-300 border border-red-700/60'
              }`}>
                <span>{settings.playLikeViknesh ? '👤 HUMAN MIRROR' : '🔥 MASTER AI'}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 mt-0.5">
              <span className="font-mono text-emerald-400 font-bold">10+0 Rapid</span>
              <span>•</span>
              <span className="text-gray-300 font-medium">
                {gameOver ? 'Finished' : gameStarted ? 'Playing' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Board Actions: Flip, Mode Switch & Generate New Board */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            onClick={() => onUpdateSettings({ playLikeViknesh: !settings.playLikeViknesh })}
            className={`flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              settings.playLikeViknesh
                ? 'bg-purple-950/90 border-purple-500/60 text-purple-300 shadow-md shadow-purple-950/30'
                : 'bg-[#27272a] hover:bg-[#333] border-[#38383e] text-gray-300'
            }`}
            title={settings.playLikeViknesh ? "Playing exactly like Viknesh. Click to switch to Master Bot" : "Playing like VICKY AI Master Bot. Click to play exactly like Viknesh"}
          >
            <span>{settings.playLikeViknesh ? '👤 Viknesh Mode' : '🤖 Master Bot'}</span>
          </button>

          {gameOver && !showGameOverModal && (
            <button
              onClick={() => setShowGameOverModal(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Result</span>
            </button>
          )}

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center space-x-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#27272a] hover:bg-[#333] text-gray-200 text-xs font-semibold border border-[#38383e] transition-colors"
            title="Flip Board"
          >
            <RotateCw className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Flip</span>
          </button>

          <button
            onClick={handleNewGame}
            className="flex items-center space-x-1 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#81b64c] hover:bg-[#95c65d] text-white text-xs font-extrabold shadow-md shadow-green-950/30 transition-transform transform active:scale-95"
            title="Generate a brand new starting board"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Board</span>
            <span className="xs:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Main Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6 items-start">
        {/* Left Column: Board + Clocks (7 cols) */}
        <div className="lg:col-span-7 space-y-2 sm:space-y-3">
          {/* Vicky's Clock (Top) */}
          <Clock
            timeSeconds={vickyTime}
            isActive={gameStarted && !gameOver && chess.turn() !== playerColor}
            playerName={settings.playLikeViknesh ? "VIKNESH (HUMAN)" : "VICKY AI"}
            playerTitle={settings.playLikeViknesh ? "MIRROR" : "MASTER BOT"}
            isEngine={true}
          />

          {/* Board with Evaluation Bar */}
          <div className="flex items-stretch justify-center space-x-1.5 sm:space-x-3">
            <EvaluationBar
              scoreCentipawns={scoreCentipawns}
              flipped={isFlipped}
            />

            <div className="flex-1 max-w-[620px] w-full">
              <Chessboard
                chess={chess}
                isFlipped={isFlipped}
                theme={settings.boardTheme}
                interactive={isUserTurn && currentMoveIdx === sanMoves.length - 1}
                onMove={handleUserMove}
                lastMove={lastMove}
              />
            </div>
          </div>

          {/* Player's Clock (Bottom) */}
          <Clock
            timeSeconds={playerTime}
            isActive={gameStarted && !gameOver && chess.turn() === playerColor}
            playerName={playerName.toUpperCase()}
            playerTitle={currentUser?.title ? currentUser.title.toUpperCase() : "YOU"}
            isEngine={false}
          />

          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-[#1e1e1e] border border-[#2c2c30] p-2.5 sm:p-3 rounded-xl text-xs">
            <div className="flex items-center space-x-2 truncate">
              <span className="text-gray-400">Status:</span>
              <span className={`font-semibold truncate ${gameOver ? (gameResult === 'win' ? 'text-emerald-400' : gameResult === 'loss' ? 'text-red-400' : 'text-blue-400') : 'text-white'}`}>
                {gameOver
                  ? `Completed (${gameOverReason || (gameResult === 'win' ? 'Victory' : gameResult === 'loss' ? 'Defeat' : 'Draw')})`
                  : isUserTurn
                  ? 'Your turn'
                  : isVickyThinking
                  ? 'Vicky thinking...'
                  : 'Ready'}
              </span>
            </div>

            {gameOver ? (
              <div className="flex items-center space-x-2 shrink-0">
                {onBack && (
                  <button
                    onClick={() => {
                      handleNewGame();
                      onBack();
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#333] text-gray-200 hover:text-white font-semibold transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNewGame}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold shadow-sm transition-transform transform active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>New Game</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleOfferDraw}
                  disabled={!gameStarted}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#333] disabled:opacity-40 text-gray-300 font-semibold transition-colors"
                >
                  <Handshake className="w-3.5 h-3.5 text-blue-400" />
                  <span>Draw</span>
                </button>

                <button
                  onClick={handleResign}
                  disabled={!gameStarted}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 disabled:opacity-40 text-red-300 font-semibold transition-colors"
                >
                  <Flag className="w-3.5 h-3.5 text-red-400" />
                  <span>Resign</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Move Log & Vicky Mind */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          {/* Mobile Tab Switcher (Visible on mobile/tablet, hidden on desktop lg) */}
          <div className="flex lg:hidden rounded-xl bg-[#1e1e22] p-1 border border-[#2c2c30]">
            <button
              onClick={() => setMobilePanel('mind')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                mobilePanel === 'mind'
                  ? 'bg-[#81b64c] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🧠 Vicky's Mind</span>
              {isVickyThinking && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </button>
            <button
              onClick={() => setMobilePanel('moves')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                mobilePanel === 'moves'
                  ? 'bg-[#81b64c] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>📜 Move History</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#18181b] text-gray-300">
                {sanMoves.length}
              </span>
            </button>
          </div>

          {/* Vicky Mind Thought Card (Shown on desktop, or on mobile when mind tab is active) */}
          <div className={`${mobilePanel === 'mind' ? 'block' : 'hidden lg:block'}`}>
            <VickyThoughtCard
              decision={vickyDecision}
              isThinking={isVickyThinking}
              personalizationWeight={settings.personalizationWeight}
            />
          </div>

          {/* Move Log History Component (Shown on desktop, or on mobile when moves tab is active) */}
          <div className={`h-[300px] sm:h-[340px] ${mobilePanel === 'moves' ? 'block' : 'hidden lg:block'}`}>
            <MoveHistory
              sanMoves={sanMoves}
              currentMoveIndex={currentMoveIdx}
              onSelectMove={handleSelectHistoryMove}
              onFirst={handleFirstMove}
              onPrev={handlePrevMove}
              onNext={handleNextMove}
              onLast={handleLastMove}
              openingName={vickyDecision?.explanation.includes('French') ? 'French Defense' : 'Standard Game'}
            />
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {showGameOverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg bg-gradient-to-tr from-[#81b64c] to-emerald-400 text-white">
              {gameResult === 'win' ? '🏆' : gameResult === 'loss' ? '💔' : '🤝'}
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">
                {gameResult === 'win'
                  ? 'Victory!'
                  : gameResult === 'loss'
                  ? 'Defeat'
                  : 'Game Drawn'}
              </h3>
              <p className="text-sm text-gray-300">{gameOverReason}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#252528] border border-[#333] text-xs text-left space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Opponent:</span>
                <span className="font-semibold text-white">VICKY AI (Personalized)</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Total Moves:</span>
                <span className="font-semibold text-white">{sanMoves.length} moves</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Time Control:</span>
                <span className="font-semibold text-emerald-400">10+0 Rapid</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Primary: Generate New Board */}
              <button
                onClick={handleNewGame}
                className="w-full py-3.5 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm shadow-xl shadow-green-950/40 transition-transform transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate New Board</span>
              </button>

              <div className="flex items-center space-x-2.5">
                {onBack && (
                  <button
                    onClick={() => {
                      handleNewGame();
                      onBack();
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#27272a] hover:bg-[#333] text-gray-200 font-bold text-xs border border-[#3f3f46] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#81b64c]" />
                    <span>Back to Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowGameOverModal(false);
                    if (onNavigateHistory) {
                      onNavigateHistory();
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#202024] hover:bg-[#2c2c32] text-gray-300 font-semibold text-xs border border-[#333338] transition-colors cursor-pointer"
                >
                  Review Board (Replay Moves)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

