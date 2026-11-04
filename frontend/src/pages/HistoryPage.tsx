import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import {
  History,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  Search,
  Gamepad2,
  Swords,
  Trophy,
  Flame,
  ArrowRight,
  Users,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Chessboard } from '../components/Chessboard';
import { GameRecord, UserProfile } from '../types/chess';
import { dbGetUserMatches, dbGetAllMatches, dbGetAllUsers, dbDeleteMatch, dbClearUserMatches } from '../utils/dbApi';
import { sounds } from '../utils/sound';
import { getValidAvatar } from '../utils/avatar';

interface HistoryPageProps {
  onStartGame?: () => void;
  currentUser?: UserProfile | null;
  targetGameId?: string | number | null;
  targetUsername?: string | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onStartGame,
  currentUser,
  targetGameId,
  targetUsername
}) => {
  const [allGames, setAllGames] = useState<GameRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(() => {
    return targetUsername || currentUser?.username || currentUser?.name || 'all';
  });

  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'draw' | 'white' | 'black'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected game for replay mode
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);
  const [replayMoveIdx, setReplayMoveIdx] = useState<number>(-1);
  const [replayChess, setReplayChess] = useState<Chess>(() => new Chess());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Auto-play state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1200); // ms per move
  const movesContainerRef = useRef<HTMLDivElement>(null);

  // Load all users and all matches on mount
  useEffect(() => {
    // 1. Fetch users
    dbGetAllUsers().then((users) => {
      if (users && users.length > 0) {
        setAllUsers(users);
      }
    });

    // 2. Fetch matches from MongoDB
    const fetchMatches = async () => {
      let matches: GameRecord[] = [];
      if (selectedUserFilter && selectedUserFilter !== 'all') {
        matches = await dbGetUserMatches(selectedUserFilter);
      } else {
        matches = await dbGetAllMatches();
      }

      if (matches && matches.length > 0) {
        setAllGames(matches);
        localStorage.setItem('vicky_live_match_history', JSON.stringify(matches));
      } else {
        // Fallback to localStorage if offline
        try {
          const saved = localStorage.getItem('vicky_live_match_history');
          if (saved) setAllGames(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };

    fetchMatches();
  }, [selectedUserFilter]);

  // Handle target game or default selection
  useEffect(() => {
    if (allGames.length > 0) {
      if (targetGameId) {
        const found = allGames.find((g) => String(g.id) === String(targetGameId));
        if (found) {
          handleSelectGame(found);
          return;
        }
      }
      if (!selectedGame || !allGames.some((g) => g.id === selectedGame.id)) {
        handleSelectGame(allGames[0]);
      }
    } else {
      setSelectedGame(null);
      setReplayMoveIdx(-1);
      setReplayChess(new Chess());
      setLastMove(null);
    }
  }, [allGames, targetGameId]);

  // Filter games based on player and search query
  const displayedGames = allGames.filter((game) => {
    if (selectedUserFilter !== 'all') {
      const target = selectedUserFilter.toLowerCase().trim();
      const gUser = (game.userName || (game as any).username || '').toLowerCase().trim();
      const gWhite = (game.white || '').toLowerCase().trim();
      const gBlack = (game.black || '').toLowerCase().trim();
      const matches = gUser === target || gWhite.includes(target) || gBlack.includes(target);
      if (!matches) return false;
    }

    if (filter === 'win' && game.outcome !== 'win') return false;
    if (filter === 'loss' && game.outcome !== 'loss') return false;
    if (filter === 'draw' && game.outcome !== 'draw') return false;
    if (filter === 'white' && game.userColor !== 'white') return false;
    if (filter === 'black' && game.userColor !== 'black') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const opn = (game.opening || '').toLowerCase();
      const white = (game.white || '').toLowerCase();
      const black = (game.black || '').toLowerCase();
      const term = (game.termination || '').toLowerCase();
      return opn.includes(q) || white.includes(q) || black.includes(q) || term.includes(q);
    }
    return true;
  });

  // Replay a game
  const handleSelectGame = (game: GameRecord) => {
    setIsPlaying(false);
    setSelectedGame(game);
    setReplayMoveIdx(-1);
    setReplayChess(new Chess());
    setLastMove(null);
  };

  // Rebuild chess board up to target move index
  const rebuildBoardToMove = (targetIdx: number, gameToReplay?: GameRecord) => {
    const activeGame = gameToReplay || selectedGame;
    if (!activeGame || !activeGame.sanHistory) return;

    const newChess = new Chess();
    let moveResult = null;

    for (let i = 0; i <= targetIdx; i++) {
      try {
        const san = activeGame.sanHistory[i];
        if (san) {
          moveResult = newChess.move(san);
        }
      } catch {
        // ignore illegal moves in legacy histories
      }
    }

    setReplayChess(newChess);
    setReplayMoveIdx(targetIdx);

    if (moveResult && moveResult.from && moveResult.to) {
      setLastMove({ from: moveResult.from, to: moveResult.to });
    } else {
      setLastMove(null);
    }
  };

  // Step Move Forward or Backward
  const handleStepMove = (step: number) => {
    if (!selectedGame || !selectedGame.sanHistory) return;
    const maxIdx = selectedGame.sanHistory.length - 1;
    const targetIdx = Math.max(-1, Math.min(maxIdx, replayMoveIdx + step));

    if (step > 0 && targetIdx >= 0) {
      const san = selectedGame.sanHistory[targetIdx];
      if (san && san.includes('x')) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
    }

    rebuildBoardToMove(targetIdx);
  };

  // Jump to specific move
  const handleJumpToMove = (idx: number) => {
    setIsPlaying(false);
    rebuildBoardToMove(idx);
  };

  // Auto-play timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying && selectedGame && selectedGame.sanHistory) {
      if (replayMoveIdx < selectedGame.sanHistory.length - 1) {
        timer = setTimeout(() => {
          handleStepMove(1);
        }, playbackSpeed);
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, replayMoveIdx, selectedGame, playbackSpeed]);

  // Keyboard navigation (Left / Right / Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepMove(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepMove(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replayMoveIdx, selectedGame]);

  // Auto-scroll moves container to active move
  useEffect(() => {
    if (movesContainerRef.current) {
      const activeElem = movesContainerRef.current.querySelector('.active-move-chip');
      if (activeElem) {
        activeElem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [replayMoveIdx]);

  const handleDownloadPgn = (game: GameRecord) => {
    const headers = [
      `[Event "Match vs Vicky AI"]`,
      `[Site "VICKY AI CHESS"]`,
      `[Date "${game.date || '2026.11.04'}"]`,
      `[White "${game.white}"]`,
      `[Black "${game.black}"]`,
      `[Result "${game.result}"]`,
      `[Opening "${game.opening || 'Standard'}"]`,
      `[TimeControl "${game.timeControl || '10+0 Rapid'}"]`,
      `[Termination "${game.termination || 'Normal'}"]`,
    ].join('\n');

    let pgnBody = '';
    const moves = game.sanHistory || [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const w = moves[i];
      const b = moves[i + 1] || '';
      pgnBody += `${moveNum}. ${w} ${b} `;
    }

    const fullPgn = `${headers}\n\n${pgnBody.trim()} ${game.result}\n`;
    const blob = new Blob([fullPgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vicky_match_${game.id || 'export'}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteGame = async (id: number | string) => {
    if (window.confirm('Delete this match record from database?')) {
      const updated = allGames.filter((g) => g.id !== id);
      setAllGames(updated);
      localStorage.setItem('vicky_live_match_history', JSON.stringify(updated));
      await dbDeleteMatch(id);
      if (selectedGame?.id === id) {
        setSelectedGame(updated[0] || null);
        setReplayMoveIdx(-1);
        setReplayChess(new Chess());
        setLastMove(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-3">
            <Swords className="w-8 h-8 text-[#81b64c]" />
            <span>Interactive Game Review & Replay</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Click any game to inspect move-by-move, auto-play replay, and analyze positions against Vicky AI.
          </p>
        </div>

        {/* Player Switcher Filter */}
        <div className="flex items-center space-x-3 self-stretch sm:self-auto">
          <div className="flex items-center space-x-2 bg-[#1c1c22] border border-[#2e2e38] px-3 py-2 rounded-2xl shadow-sm">
            <Users className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-400 font-medium">Player:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#1c1c22] text-white">All Players (MongoDB Community)</option>
              {currentUser && (
                <option value={currentUser.username || currentUser.name} className="bg-[#1c1c22] text-[#81b64c]">
                  ★ {currentUser.name} (My Matches)
                </option>
              )}
              {allUsers
                .filter((u) => u.username !== currentUser?.username)
                .map((u) => (
                  <option key={u.username} value={u.username} className="bg-[#1c1c22] text-white">
                    {u.name} (@{u.username})
                  </option>
                ))}
            </select>
          </div>

          {onStartGame && (
            <button
              onClick={onStartGame}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-xs shadow-md shadow-green-950/40 transition-transform transform hover:scale-105"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>PLAY MATCH</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Chessboard Replayer + Right Games List */}
      {displayedGames.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-[#1a1a1d] border border-[#2e2e34] text-center space-y-6 max-w-xl mx-auto shadow-2xl">
          <div className="w-20 h-20 rounded-3xl mx-auto bg-gradient-to-tr from-[#81b64c]/20 to-amber-500/10 border border-[#81b64c]/40 flex items-center justify-center text-4xl shadow-inner">
            ♟
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">No Matches Found</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              No saved matches were found for the selected player. Play a match against Vicky AI to record your first game!
            </p>
          </div>
          {onStartGame && (
            <button
              onClick={onStartGame}
              className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-[#81b64c] hover:bg-[#95c65d] text-white font-extrabold text-sm shadow-xl shadow-green-950/40 transition-transform transform hover:scale-105 active:scale-95"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>PLAY MATCH NOW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Replayer (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {selectedGame ? (
              <div className="p-6 rounded-3xl bg-[#1b1b1f] border border-[#2c2c36] space-y-5 shadow-2xl">
                {/* Match Details Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#292932]">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                          selectedGame.outcome === 'win'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : selectedGame.outcome === 'loss'
                            ? 'bg-red-950 text-red-400 border border-red-800/50'
                            : 'bg-blue-950 text-blue-400 border border-blue-800/50'
                        }`}
                      >
                        {selectedGame.outcome === 'win'
                          ? 'VICTORY 1-0'
                          : selectedGame.outcome === 'loss'
                          ? 'DEFEAT 0-1'
                          : 'DRAW 1/2-1/2'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {selectedGame.timeControl || '10+0 Rapid'} • {selectedGame.date || 'Today'}
                      </span>
                    </div>

                    <div className="text-base font-extrabold text-white mt-1 flex items-center space-x-2">
                      <span>⚪ {selectedGame.white}</span>
                      <span className="text-gray-500 font-normal">vs</span>
                      <span>⚫ {selectedGame.black}</span>
                    </div>

                    <div className="text-xs text-amber-400/90 font-mono mt-0.5">
                      {selectedGame.opening || 'Standard Opening'}
                      {selectedGame.termination ? ` (${selectedGame.termination})` : ''}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadPgn(selectedGame)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#23232a] hover:bg-[#2c2c33] text-gray-200 text-xs font-bold border border-[#33333d] transition-colors self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PGN</span>
                  </button>
                </div>

                {/* The Chessboard */}
                <div className="max-w-[460px] mx-auto shadow-2xl rounded-2xl overflow-hidden border border-[#2a2a32]">
                  <Chessboard
                    chess={replayChess}
                    interactive={false}
                    onMove={() => {}}
                    isFlipped={selectedGame.userColor === 'black'}
                    lastMove={lastMove}
                  />
                </div>

                {/* Replay Controls & Auto-Play */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-2">
                    {/* First move */}
                    <button
                      onClick={() => handleJumpToMove(-1)}
                      disabled={replayMoveIdx < 0}
                      className="p-2.5 rounded-xl bg-[#232329] hover:bg-[#2c2c33] disabled:opacity-30 text-gray-300 transition-colors cursor-pointer"
                      title="Jump to Start (|<)"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Step back */}
                    <button
                      onClick={() => handleStepMove(-1)}
                      disabled={replayMoveIdx < 0}
                      className="p-2.5 rounded-xl bg-[#232329] hover:bg-[#2c2c33] disabled:opacity-30 text-gray-300 transition-colors cursor-pointer"
                      title="Previous Move (Left Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Play / Pause Auto-replay */}
                    <button
                      onClick={() => setIsPlaying((p) => !p)}
                      className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/30'
                          : 'bg-[#81b64c] hover:bg-[#95c65d] text-white shadow-lg shadow-green-950/40'
                      }`}
                      title="Spacebar to Play/Pause"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>PAUSE</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>AUTO REPLAY</span>
                        </>
                      )}
                    </button>

                    {/* Step forward */}
                    <button
                      onClick={() => handleStepMove(1)}
                      disabled={replayMoveIdx >= (selectedGame.sanHistory?.length || 0) - 1}
                      className="p-2.5 rounded-xl bg-[#232329] hover:bg-[#2c2c33] disabled:opacity-30 text-gray-300 transition-colors cursor-pointer"
                      title="Next Move (Right Arrow)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Final move */}
                    <button
                      onClick={() => handleJumpToMove((selectedGame.sanHistory?.length || 0) - 1)}
                      disabled={replayMoveIdx >= (selectedGame.sanHistory?.length || 0) - 1}
                      className="p-2.5 rounded-xl bg-[#232329] hover:bg-[#2c2c33] disabled:opacity-30 text-gray-300 transition-colors cursor-pointer"
                      title="Jump to End (>|)"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Move counter and playback speed */}
                  <div className="flex items-center justify-between text-xs px-3 text-gray-400 font-mono">
                    <span className="font-bold text-white">
                      Move {replayMoveIdx < 0 ? 'Start' : `${replayMoveIdx + 1} of ${selectedGame.sanHistory?.length || 0}`}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span>Speed:</span>
                      {[
                        { label: '1x', val: 1200 },
                        { label: '1.5x', val: 800 },
                        { label: '2x', val: 500 },
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => setPlaybackSpeed(s.val)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            playbackSpeed === s.val
                              ? 'bg-[#81b64c] text-white'
                              : 'bg-[#232329] text-gray-400 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score Sheet Notation Table (Clickable moves) */}
                <div className="space-y-1.5 pt-2 border-t border-[#292932]">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 block px-1">
                    Game Score Sheet (Click any move to jump):
                  </span>
                  <div
                    ref={movesContainerRef}
                    className="max-h-44 overflow-y-auto p-2 rounded-2xl bg-[#141417] border border-[#26262e] font-mono text-xs divide-y divide-[#1e1e24]"
                  >
                    {(() => {
                      const moves = selectedGame.sanHistory || [];
                      const rows = [];
                      for (let i = 0; i < moves.length; i += 2) {
                        const moveNum = Math.floor(i / 2) + 1;
                        const whiteMove = moves[i];
                        const blackMove = moves[i + 1];
                        const whiteActive = replayMoveIdx === i;
                        const blackActive = replayMoveIdx === i + 1;

                        rows.push(
                          <div key={i} className="flex items-center py-1 px-2 hover:bg-[#1a1a20] rounded-lg">
                            <span className="w-10 text-gray-500 font-bold text-[11px]">{moveNum}.</span>
                            <button
                              onClick={() => handleJumpToMove(i)}
                              className={`flex-1 text-left px-2 py-0.5 rounded transition-colors ${
                                whiteActive
                                  ? 'bg-[#81b64c] text-white font-black active-move-chip'
                                  : 'text-gray-300 hover:bg-[#25252c]'
                              }`}
                            >
                              {whiteMove}
                            </button>
                            {blackMove && (
                              <button
                                onClick={() => handleJumpToMove(i + 1)}
                                className={`flex-1 text-left px-2 py-0.5 rounded transition-colors ${
                                  blackActive
                                    ? 'bg-[#81b64c] text-white font-black active-move-chip'
                                    : 'text-gray-400 hover:bg-[#25252c]'
                                }`}
                              >
                                {blackMove}
                              </button>
                            )}
                          </div>
                        );
                      }
                      return rows;
                    })()}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Match List with Filters (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search matches by opening, result..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1b1b1f] border border-[#2c2c36] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#81b64c]"
                />
              </div>

              {/* Outcome filter buttons */}
              <div className="flex items-center space-x-1 bg-[#1b1b1f] p-1 rounded-2xl border border-[#2c2c36] text-[11px]">
                {(['all', 'win', 'loss', 'draw'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all ${
                      filter === f
                        ? 'bg-[#81b64c] text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Game Cards */}
            <div className="space-y-3 max-h-[780px] overflow-y-auto pr-1">
              {displayedGames.map((game) => {
                const isSelected = selectedGame?.id === game.id;
                return (
                  <div
                    key={game.id}
                    onClick={() => handleSelectGame(game)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#23232c] to-[#1c1c22] border-[#81b64c] shadow-xl shadow-green-950/20'
                        : 'bg-[#19191d] border-[#292932] hover:border-[#3e3e4a] hover:bg-[#1f1f25]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            game.outcome === 'win'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : game.outcome === 'loss'
                              ? 'bg-red-950 text-red-400 border border-red-800/40'
                              : 'bg-blue-950 text-blue-400 border border-blue-800/40'
                          }`}
                        >
                          {game.outcome === 'win'
                            ? 'VICTORY 1-0'
                            : game.outcome === 'loss'
                            ? 'DEFEAT 0-1'
                            : 'DRAW 1/2-1/2'}
                        </span>
                        <span className="font-extrabold text-white text-sm">
                          ⚪ {game.white} <span className="text-gray-500 font-normal">vs</span> ⚫ {game.black}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 flex items-center space-x-2 font-mono">
                        <span className="text-amber-400/90 font-semibold">{game.opening || 'Standard'}</span>
                        <span>•</span>
                        <span>{game.moveCount || (game.sanHistory?.length || 0)} moves</span>
                        <span>•</span>
                        <span>{game.date || 'Today'}</span>
                      </div>

                      {game.termination && (
                        <div className="text-[11px] text-gray-500 italic">
                          {game.termination}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectGame(game)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                          isSelected
                            ? 'bg-[#81b64c] text-white'
                            : 'bg-[#25252d] text-gray-300 hover:bg-[#30303a] hover:text-white'
                        }`}
                        title="Click to replay this game"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Replay</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPgn(game)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#2b2b34] transition-colors"
                        title="Download PGN"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Delete Match"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
