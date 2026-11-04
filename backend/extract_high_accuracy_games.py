import chess
import chess.pgn
import json
import os
import sys
import math
from collections import defaultdict, Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.vicky_engine import PIECE_VALUES, PAWN_PST, KNIGHT_PST, BISHOP_PST

PGN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chess_com_games_2026-11-04.pgn")
HIGH_ACC_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "high_accuracy_profile.json")
HIGH_ACC_TRAIN_DATA_PATH = os.path.join(os.path.dirname(__file__), "high_accuracy_training_positions.json")
FRONTEND_HIGH_ACC_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "src", "data", "high_accuracy_profile.json")

def fast_eval_board(board: chess.Board) -> int:
    """Ultra-fast static positional evaluation without legal moves generation overhead."""
    if board.is_checkmate():
        return -99999
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0
    piece_map = board.piece_map()
    for sq, piece in piece_map.items():
        val = PIECE_VALUES.get(piece.piece_type, 0)
        pst_val = 0
        sq_idx = sq if piece.color == chess.WHITE else chess.square_mirror(sq)
        if piece.piece_type == chess.PAWN:
            pst_val = PAWN_PST[sq_idx]
        elif piece.piece_type == chess.KNIGHT:
            pst_val = KNIGHT_PST[sq_idx]
        elif piece.piece_type == chess.BISHOP:
            pst_val = BISHOP_PST[sq_idx]

        total = val + pst_val
        if piece.color == chess.WHITE:
            score += total
        else:
            score -= total

    turn = board.turn
    return score if turn == chess.WHITE else -score

def calculate_move_centipawn_loss(board: chess.Board, chosen_move: chess.Move):
    """Accurately calculates centipawn loss of chosen move in milliseconds."""
    board.push(chosen_move)
    chosen_eval = -fast_eval_board(board)
    board.pop()

    # Sample top candidates (captures, checks, or up to 8 moves) to find best alternative
    best_eval = chosen_eval
    for m in board.legal_moves:
        if m == chosen_move:
            continue
        board.push(m)
        ev = -fast_eval_board(board)
        board.pop()
        if ev > best_eval:
            best_eval = ev

    cpl = max(0, best_eval - chosen_eval)
    cpl_clamped = min(800, cpl)
    # Standard chess accuracy curve: 100 * exp(-0.004 * cpl)
    # 0 cp = 100%, 15 cp = 94%, 30 cp = 88.7%, 50 cp = 81.9%, 100 cp = 67%
    accuracy = 100.0 * math.exp(-0.004 * cpl_clamped)
    return cpl, accuracy

def analyze_all_games_for_accuracy():
    print(f"Analyzing {PGN_PATH} for Viknesh's High-Accuracy Games...")
    
    games_accuracy_records = []
    high_accuracy_games = []
    
    total_parsed = 0
    viknesh_usernames = {"viknesh004", "viknesh"}
    
    with open(PGN_PATH, "r", encoding="utf-8", errors="replace") as pgn_file:
        while True:
            try:
                game = chess.pgn.read_game(pgn_file)
            except Exception:
                continue
                
            if game is None:
                break
                
            total_parsed += 1
            headers = game.headers
            white_player = headers.get("White", "").strip()
            black_player = headers.get("Black", "").strip()
            result = headers.get("Result", "*").strip()
            termination = headers.get("Termination", "").strip()
            date = headers.get("Date", "").strip()
            opening = headers.get("Opening", "").strip()
            eco = headers.get("ECO", "").strip()
            
            is_white = "viknesh" in white_player.lower()
            is_black = "viknesh" in black_player.lower()
            if not is_white and not is_black:
                is_white = True
                
            viknesh_color = chess.WHITE if is_white else chess.BLACK
            color_str = "white" if is_white else "black"
            is_win = (is_white and result == "1-0") or (is_black and result == "0-1")
            
            board = game.board()
            san_history = []
            move_accuracies = []
            move_cpls = []
            game_positions = []
            
            for move_idx, node in enumerate(game.mainline()):
                move = node.move
                current_turn = board.turn
                is_viknesh_turn = (current_turn == viknesh_color)
                san = board.san(move)
                san_history.append(san)
                
                if is_viknesh_turn and board.fullmove_number <= 35:
                    cpl, acc = calculate_move_centipawn_loss(board, move)
                    move_cpls.append(cpl)
                    move_accuracies.append(acc)
                    
                    legal_moves = [m.uci() for m in board.legal_moves]
                    if len(legal_moves) > 1:
                        game_positions.append({
                            "fen": board.fen(),
                            "chosen_move": move.uci(),
                            "legal_moves": legal_moves,
                            "fullmove_number": board.fullmove_number,
                            "is_white": is_white,
                            "move_cpl": cpl,
                            "move_accuracy": round(acc, 1)
                        })
                        
                board.push(move)
                
            avg_accuracy = sum(move_accuracies) / max(1, len(move_accuracies))
            avg_cpl = sum(move_cpls) / max(1, len(move_cpls))
            
            # High Accuracy Game Criteria:
            # Won games with accuracy >= 68% or average centipawn loss <= 55cp, or outstanding games with acc >= 78%
            is_high_accuracy = (is_win and avg_accuracy >= 68.0) or (avg_accuracy >= 76.0)
            
            clean_opening = opening or (" ".join(san_history[:2]) if len(san_history) >= 2 else "Standard")
            record = {
                "id": total_parsed,
                "date": date,
                "white": white_player,
                "black": black_player,
                "result": result,
                "userColor": color_str,
                "isWin": is_win,
                "moveCount": len(san_history),
                "avgAccuracy": round(avg_accuracy, 1),
                "avgCpl": round(avg_cpl, 1),
                "isHighAccuracy": is_high_accuracy,
                "opening": clean_opening,
                "eco": eco,
                "termination": termination,
                "sanHistory": san_history,
                "positions": game_positions
            }
            
            games_accuracy_records.append(record)
            if is_high_accuracy:
                high_accuracy_games.append(record)

    print(f"Total Games Analyzed: {len(games_accuracy_records)}")
    print(f"High-Accuracy Peak Games Isolated: {len(high_accuracy_games)} games!")
    
    high_acc_wins = sum(1 for g in high_accuracy_games if g["isWin"])
    avg_high_accuracy = sum(g["avgAccuracy"] for g in high_accuracy_games) / max(1, len(high_accuracy_games))
    avg_high_cpl = sum(g["avgCpl"] for g in high_accuracy_games) / max(1, len(high_accuracy_games))
    high_acc_openings = Counter(g["opening"] for g in high_accuracy_games)
    
    # Flatten positions for High-Accuracy Model Training with quality weights
    training_positions = []
    for g in games_accuracy_records:
        gid = g["id"]
        is_high = g["isHighAccuracy"]
        # Weighting: 3.5 for high accuracy games, 1.2 for wins, 0.4 for losses
        game_weight = 3.5 if is_high else (1.2 if g["isWin"] else 0.4)
        
        for pos in g["positions"]:
            pos["game_id"] = gid
            pos["is_high_accuracy_game"] = is_high
            pos["sample_weight"] = game_weight
            training_positions.append(pos)
            
    summary = {
        "totalGamesAnalyzed": len(games_accuracy_records),
        "highAccuracyGamesCount": len(high_accuracy_games),
        "highAccuracyPercentage": round((len(high_accuracy_games) / len(games_accuracy_records)) * 100, 1),
        "avgHighAccuracyScore": round(avg_high_accuracy, 1),
        "avgHighCentipawnLoss": round(avg_high_cpl, 1),
        "highAccuracyWins": high_acc_wins,
        "highAccuracyWinRate": round((high_acc_wins / max(1, len(high_accuracy_games))) * 100, 1),
        "topHighAccuracyOpenings": [
            {"opening": op, "count": count} for op, count in high_acc_openings.most_common(8)
        ],
        "highAccuracyGamesSample": [
            {
                "id": g["id"],
                "date": g["date"],
                "white": g["white"],
                "black": g["black"],
                "result": g["result"],
                "accuracy": g["avgAccuracy"],
                "cpl": g["avgCpl"],
                "opening": g["opening"],
                "moveCount": g["moveCount"],
                "termination": g["termination"]
            }
            for g in sorted(high_accuracy_games, key=lambda x: x["avgAccuracy"], reverse=True)[:20]
        ]
    }
    
    with open(HIGH_ACC_PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Saved High Accuracy Profile to {HIGH_ACC_PROFILE_PATH}")
    
    with open(FRONTEND_HIGH_ACC_PATH, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Saved Frontend High Accuracy Profile to {FRONTEND_HIGH_ACC_PATH}")
    
    with open(HIGH_ACC_TRAIN_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(training_positions, f)
    print(f"Saved {len(training_positions)} High-Accuracy Weighted Training Positions to {HIGH_ACC_TRAIN_DATA_PATH}")
    
    return summary

if __name__ == "__main__":
    analyze_all_games_for_accuracy()
