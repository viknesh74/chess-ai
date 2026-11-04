import chess
import chess.pgn
import json
import os
import re
from collections import defaultdict, Counter

PGN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chess_com_games_2026-11-04.pgn")
OUTPUT_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "viknesh_chess_profile.json")
OUTPUT_TRAIN_DATA_PATH = os.path.join(os.path.dirname(__file__), "training_positions.json")

def analyze_pgn(pgn_path=PGN_PATH):
    if not os.path.exists(pgn_path):
        raise FileNotFoundError(f"PGN file not found at {pgn_path}")

    total_parsed = 0
    parse_errors = []
    
    # Viknesh identity
    VIKNESH_USERNAMES = {"viknesh004", "viknesh"}

    # Statistics accumulators
    games_as_white = 0
    games_as_black = 0
    wins = 0
    losses = 0
    draws = 0
    
    termination_reasons = Counter()
    results_by_color = {
        "white": {"wins": 0, "losses": 0, "draws": 0},
        "black": {"wins": 0, "losses": 0, "draws": 0}
    }
    
    openings_counter = Counter()
    openings_outcomes = defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
    eco_counter = Counter()
    
    first_moves_white = Counter()
    first_moves_black = Counter()
    
    total_moves_list = []
    
    # Castling behavior
    castling_stats = {
        "kingside": 0,
        "queenside": 0,
        "none": 0,
        "castling_move_sum": 0,
        "castled_games_count": 0
    }
    
    # Piece move frequency
    piece_move_counter = Counter()
    
    # Tactical patterns
    tactics = {
        "checks_given": 0,
        "checks_received": 0,
        "captures_made": 0,
        "captures_received": 0,
        "promotions_made": 0,
        "checkmates_delivered": 0,
        "checkmates_suffered": 0
    }
    
    # Mistakes / Blunder analysis
    mistake_types = Counter()
    
    # List of games for UI history and replaying
    parsed_games_summary = []
    
    # Training dataset positions
    training_data = []

    print(f"Opening PGN file: {pgn_path}")
    
    with open(pgn_path, "r", encoding="utf-8", errors="replace") as pgn_file:
        while True:
            try:
                game = chess.pgn.read_game(pgn_file)
            except Exception as e:
                parse_errors.append(f"Error parsing game after index {total_parsed}: {str(e)}")
                continue

            if game is None:
                break
                
            total_parsed += 1
            headers = game.headers
            white_player = headers.get("White", "Unknown").strip()
            black_player = headers.get("Black", "Unknown").strip()
            result = headers.get("Result", "*").strip()
            termination = headers.get("Termination", "Unknown").strip()
            eco = headers.get("ECO", "").strip()
            date = headers.get("Date", "").strip()
            time_control = headers.get("TimeControl", "600").strip()
            white_elo = headers.get("WhiteElo", "?").strip()
            black_elo = headers.get("BlackElo", "?").strip()
            
            # Determine Viknesh's color
            is_white = white_player.lower() in VIKNESH_USERNAMES
            is_black = black_player.lower() in VIKNESH_USERNAMES
            
            if not is_white and not is_black:
                # If username not matched exactly, check substring
                if "viknesh" in white_player.lower():
                    is_white = True
                elif "viknesh" in black_player.lower():
                    is_black = True
                else:
                    # Default fallback if player is white or black
                    is_white = True # Treat as primary player if not specified
            
            viknesh_color = chess.WHITE if is_white else chess.BLACK
            color_str = "white" if is_white else "black"
            opponent_name = black_player if is_white else white_player
            opponent_elo = black_elo if is_white else white_elo
            viknesh_elo = white_elo if is_white else black_elo

            if is_white:
                games_as_white += 1
            else:
                games_as_black += 1

            # Determine outcome for Viknesh
            if result == "1-0":
                if is_white:
                    wins += 1
                    outcome = "win"
                    results_by_color["white"]["wins"] += 1
                else:
                    losses += 1
                    outcome = "loss"
                    results_by_color["black"]["losses"] += 1
            elif result == "0-1":
                if is_black:
                    wins += 1
                    outcome = "win"
                    results_by_color["black"]["wins"] += 1
                else:
                    losses += 1
                    outcome = "loss"
                    results_by_color["white"]["losses"] += 1
            elif result == "1/2-1/2":
                draws += 1
                outcome = "draw"
                results_by_color[color_str]["draws"] += 1
            else:
                outcome = "unknown"

            termination_reasons[termination] += 1
            
            # Walk through the board moves
            board = game.board()
            moves_history = []
            san_history = []
            castled_this_game = False
            castled_move_num = None
            
            viknesh_moves_in_game = 0
            
            # Track pieces on board for simple blunder estimation
            game_positions_for_train = []
            
            first_move_recorded = False
            opening_name = headers.get("Opening", "")
            
            for move_idx, node in enumerate(game.mainline()):
                move = node.move
                current_turn = board.turn
                is_viknesh_turn = (current_turn == viknesh_color)
                san = board.san(move)
                uci = move.uci()
                san_history.append(san)
                moves_history.append(uci)
                
                # Check first move
                if not first_move_recorded:
                    if current_turn == chess.WHITE:
                        first_moves_white[san] += 1
                    if move_idx == 1 and current_turn == chess.BLACK:
                        first_moves_black[san] += 1
                    if move_idx >= 1:
                        first_move_recorded = True

                # Extract training positions on Viknesh turns (up to move 40 to avoid trivial endgame flags)
                if is_viknesh_turn and board.fullmove_number <= 45:
                    legal_moves = [m.uci() for m in board.legal_moves]
                    if len(legal_moves) > 1:
                        game_positions_for_train.append({
                            "fen": board.fen(),
                            "chosen_move": uci,
                            "legal_moves": legal_moves,
                            "fullmove_number": board.fullmove_number,
                            "is_white": is_white
                        })
                
                # Check tactical flags
                moving_piece = board.piece_at(move.from_square)
                is_capture = board.is_capture(move)
                gives_check = board.gives_check(move)
                is_kingside_castle = board.is_kingside_castling(move)
                is_queenside_castle = board.is_queenside_castling(move)
                is_promo = (move.promotion is not None)
                
                if is_viknesh_turn:
                    viknesh_moves_in_game += 1
                    if moving_piece:
                        piece_symbol = moving_piece.symbol().upper()
                        piece_move_counter[piece_symbol] += 1
                        
                    if is_capture:
                        tactics["captures_made"] += 1
                    if gives_check:
                        tactics["checks_given"] += 1
                    if is_promo:
                        tactics["promotions_made"] += 1
                        
                    if is_kingside_castle:
                        castled_this_game = True
                        castling_stats["kingside"] += 1
                        castled_move_num = board.fullmove_number
                    elif is_queenside_castle:
                        castled_this_game = True
                        castling_stats["queenside"] += 1
                        castled_move_num = board.fullmove_number
                        
                    # Blunder detection heuristic:
                    # Early Queen move: Queen moved before move 7 while minor pieces undeveloped
                    if moving_piece and moving_piece.piece_type == chess.QUEEN and board.fullmove_number <= 5:
                        mistake_types["Early Queen Excursion"] += 1
                else:
                    if is_capture:
                        tactics["captures_received"] += 1
                    if gives_check:
                        tactics["checks_received"] += 1
                
                board.push(move)

            # Post-game checkmate check
            if board.is_checkmate():
                if board.turn == viknesh_color:
                    tactics["checkmates_suffered"] += 1
                    mistake_types["Checkmated Defense Failure"] += 1
                else:
                    tactics["checkmates_delivered"] += 1

            # Castling tracking
            if castled_this_game and castled_move_num:
                castling_stats["castling_move_sum"] += castled_move_num
                castling_stats["castled_games_count"] += 1
            else:
                castling_stats["none"] += 1
                if outcome == "loss":
                    mistake_types["King Left in Center (Loss without castling)"] += 1

            # Opening determination
            if not opening_name:
                # Infer opening from first few moves if header missing
                if len(san_history) >= 2:
                    w1 = san_history[0] if len(san_history) > 0 else ""
                    b1 = san_history[1] if len(san_history) > 1 else ""
                    opening_name = f"{w1} {b1}"
                else:
                    opening_name = "Custom / Short Game"
            
            openings_counter[opening_name] += 1
            if eco:
                eco_counter[eco] += 1
            openings_outcomes[opening_name]["total"] += 1
            if outcome == "win":
                openings_outcomes[opening_name]["wins"] += 1
            elif outcome == "loss":
                openings_outcomes[opening_name]["losses"] += 1
            elif outcome == "draw":
                openings_outcomes[opening_name]["draws"] += 1

            total_moves_list.append(len(moves_history))
            
            # Save summary for game history
            if len(parsed_games_summary) < 500: # Store all
                parsed_games_summary.append({
                    "id": total_parsed,
                    "date": date,
                    "white": white_player,
                    "black": black_player,
                    "whiteElo": white_elo,
                    "blackElo": black_elo,
                    "result": result,
                    "outcome": outcome,
                    "userColor": color_str,
                    "timeControl": time_control,
                    "termination": termination,
                    "opening": opening_name,
                    "eco": eco,
                    "moveCount": len(san_history),
                    "sanHistory": san_history,
                    "uciHistory": moves_history,
                    "finalFen": board.fen()
                })
                
            # Append training positions with game id for clean group-aware train/test split
            for pos in game_positions_for_train:
                pos["game_id"] = total_parsed
                training_data.append(pos)

    # Calculate aggregate metrics
    avg_game_length_moves = sum(total_moves_list) / max(1, len(total_moves_list))
    avg_castling_move = (castling_stats["castling_move_sum"] / max(1, castling_stats["castled_games_count"])) if castling_stats["castled_games_count"] > 0 else 0
    
    # Sort openings
    top_openings = []
    for op_name, count in openings_counter.most_common(12):
        stats = openings_outcomes[op_name]
        win_rate = round((stats["wins"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0
        top_openings.append({
            "name": op_name,
            "played": count,
            "wins": stats["wins"],
            "losses": stats["losses"],
            "draws": stats["draws"],
            "winRate": win_rate
        })
        
    top_mistakes = [{"type": k, "count": v} for k, v in mistake_types.most_common(6)]
    
    profile = {
        "datasetInfo": {
            "totalGamesParsed": total_parsed,
            "parseErrorsCount": len(parse_errors),
            "parseErrors": parse_errors,
            "sourceFile": os.path.basename(pgn_path)
        },
        "player": {
            "name": "Viknesh",
            "username": "viknesh004"
        },
        "overview": {
            "totalGames": total_parsed,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "winRate": round((wins / max(1, total_parsed)) * 100, 1),
            "lossRate": round((losses / max(1, total_parsed)) * 100, 1),
            "drawRate": round((draws / max(1, total_parsed)) * 100, 1),
            "whiteGames": games_as_white,
            "blackGames": games_as_black,
            "whiteStats": {
                "wins": results_by_color["white"]["wins"],
                "losses": results_by_color["white"]["losses"],
                "draws": results_by_color["white"]["draws"],
                "winRate": round((results_by_color["white"]["wins"] / max(1, games_as_white)) * 100, 1)
            },
            "blackStats": {
                "wins": results_by_color["black"]["wins"],
                "losses": results_by_color["black"]["losses"],
                "draws": results_by_color["black"]["draws"],
                "winRate": round((results_by_color["black"]["wins"] / max(1, games_as_black)) * 100, 1)
            },
            "averageGameLengthPlies": round(avg_game_length_moves, 1),
            "averageGameLengthFullMoves": round(avg_game_length_moves / 2, 1)
        },
        "openings": {
            "topOpenings": top_openings,
            "firstMovesWhite": [{"move": m, "count": c} for m, c in first_moves_white.most_common(6)],
            "firstMovesBlack": [{"move": m, "count": c} for m, c in first_moves_black.most_common(6)],
            "topEco": [{"eco": e, "count": c} for e, c in eco_counter.most_common(6)]
        },
        "castling": {
            "kingside": castling_stats["kingside"],
            "queenside": castling_stats["queenside"],
            "none": castling_stats["none"],
            "averageCastlingMove": round(avg_castling_move, 1),
            "kingsidePercentage": round((castling_stats["kingside"] / max(1, total_parsed)) * 100, 1),
            "queensidePercentage": round((castling_stats["queenside"] / max(1, total_parsed)) * 100, 1),
            "uncastledPercentage": round((castling_stats["none"] / max(1, total_parsed)) * 100, 1)
        },
        "pieceActivity": [{"piece": p, "moves": c} for p, c in piece_move_counter.most_common()],
        "tactics": tactics,
        "terminations": [{"reason": r, "count": c} for r, c in termination_reasons.most_common(6)],
        "mistakes": top_mistakes,
        "recentGames": parsed_games_summary[-10:],
        "allGames": parsed_games_summary
    }

    # Save outputs
    with open(OUTPUT_PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)
    print(f"Saved profile to {OUTPUT_PROFILE_PATH}")

    with open(OUTPUT_TRAIN_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(training_data, f)
    print(f"Saved {len(training_data)} training positions across {total_parsed} games to {OUTPUT_TRAIN_DATA_PATH}")

    # Also save profile into frontend/src/data/ for instant loading in the web app
    frontend_data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "src", "data")
    os.makedirs(frontend_data_dir, exist_ok=True)
    frontend_profile_path = os.path.join(frontend_data_dir, "viknesh_profile.json")
    with open(frontend_profile_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2)
    print(f"Saved frontend profile to {frontend_profile_path}")

    return profile

if __name__ == "__main__":
    analyze_pgn()
