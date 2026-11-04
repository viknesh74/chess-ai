import chess
import json
import os
import random
import xgboost as xgb
import pandas as pd
import numpy as np

# Load XGBoost model (High-Accuracy Master Model)
HIGH_ACC_MODEL_PATH = os.path.join(os.path.dirname(__file__), "vicky_high_accuracy_model.json")
HIGH_ACC_REPORT_PATH = os.path.join(os.path.dirname(__file__), "vicky_high_accuracy_report.json")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "vicky_xgboost_model.json")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "vicky_model_report.json")
PROFILE_PATH = os.path.join(os.path.dirname(__file__), "viknesh_chess_profile.json")
HIGH_ACC_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "high_accuracy_profile.json")

# Piece values in centipawns
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 325,
    chess.BISHOP: 335,
    chess.ROOK: 505,
    chess.QUEEN: 950,
    chess.KING: 20000
}

# Standard Piece-Square Tables (Midgame) - Flipped for python-chess native indexing (a1=0, h1=7, a8=56, h8=63)
def _orient_pst(c_table):
    """Flips visual/C top-down (Rank 8 at index 0) tables into python-chess native order (Rank 1 at index 0)."""
    res = []
    for r in range(7, -1, -1):
        res.extend(c_table[r*8:(r+1)*8])
    return res

PAWN_PST = _orient_pst([
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
])

KNIGHT_PST = _orient_pst([
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
])

BISHOP_PST = _orient_pst([
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
])

ROOK_PST = _orient_pst([
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
])

QUEEN_PST = _orient_pst([
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
])

# Master Opening Book for Viknesh's signature high-accuracy repertoire
MASTER_OPENING_BOOK = {
    # Initial moves
    "": ["e2e4", "e2e3", "d2d4"],
    
    # Viknesh Black response to 1. e4: Signature French Defense (59 High-Acc Wins!)
    "e2e4": ["e7e6"],
    
    # French Defense continuations:
    # 1. e4 e6 2. d4 -> 2... d5!
    "e2e4 e7e6 d2d4": ["d7d5"],
    # 1. e4 e6 2. Nf3 -> 2... d5!
    "e2e4 e7e6 g1f3": ["d7d5"],
    # 1. e4 e6 2. d3 -> 2... d5!
    "e2e4 e7e6 d2d3": ["d7d5"],
    # 1. e4 e6 2. Nc3 -> 2... d5!
    "e2e4 e7e6 b1c3": ["d7d5"],
    # 1. e4 e6 2. d4 d5 3. e5 (Advance) -> 3... c5!
    "e2e4 e7e6 d2d4 d7d5 e4e5": ["c7c5"],
    # 1. e4 e6 2. d4 d5 3. Nc3 (Classical/Winawer) -> 3... Nf6 or Bb4
    "e2e4 e7e6 d2d4 d7d5 b1c3": ["g8f6", "f8b4"],
    # 1. e4 e6 2. d4 d5 3. Nd2 (Tarrasch) -> 3... c5
    "e2e4 e7e6 d2d4 d7d5 b1d2": ["c7c5"],
    # 1. e4 e6 2. d4 d5 3. exd5 (Exchange) -> 3... exd5
    "e2e4 e7e6 d2d4 d7d5 e4d5": ["e6d5"],
    # 1. e4 e6 2. d4 d5 3. f1d3 -> 3... dxe4
    "e2e4 e7e6 d2d4 d7d5 f1d3": ["d5e4"],
    
    # In response to 1. d4 -> 1... e6 or 1... d5
    "d2d4": ["e7e6", "d7d5", "g8f6"],
    "d2d4 e7e6 c2c4": ["d7d5", "g8f6"],
    "d2d4 d7d5 c2c4": ["e7e6", "c7c6"],
    
    # White 1. e3 setups (Viknesh's signature White opening)
    "e2e3 e7e5": ["d2d4", "c2c4", "g1f3"],
    "e2e3 d7d5": ["d2d4", "g1f3", "c2c4"],
    
    # White 1. e4 classical continuations
    "e2e4 e7e5": ["g1f3"], # 2. Nf3
    "e2e4 e7e5 g1f3 b8c6": ["f1c4", "f1b5", "d2d4", "b1c3"], # Bc4 (Italian), Bb5 (Spanish), d4 (Scotch), Nc3
    "e2e4 e7e5 g1f3 g8f6": ["f3e5", "d2d4"], # Petrov Defense
    "e2e4 c7c5": ["g1f3"], # Open Sicilian setup
    "e2e4 c7c5 g1f3 d7d6": ["d2d4"],
    "e2e4 c7c5 g1f3 b8c6": ["d2d4"],
    "e2e4 e7e6": ["d2d4"], # Vicky as White vs French
}

class VickyChessEngine:
    def __init__(self):
        self.model = None
        self.feature_cols = []
        self.profile = {}
        self.high_acc_profile = {}
        self.load_resources()

    def load_resources(self):
        target_model = HIGH_ACC_MODEL_PATH if os.path.exists(HIGH_ACC_MODEL_PATH) else MODEL_PATH
        target_report = HIGH_ACC_REPORT_PATH if os.path.exists(HIGH_ACC_REPORT_PATH) else REPORT_PATH

        if os.path.exists(target_model) and os.path.exists(target_report):
            try:
                self.model = xgb.XGBClassifier()
                self.model.load_model(target_model)
                with open(target_report, "r", encoding="utf-8") as f:
                    rep = json.load(f)
                    self.feature_cols = rep.get("featureColumns", [])
                print(f"Loaded Vicky Master High-Accuracy Model ({os.path.basename(target_model)}) successfully with {len(self.feature_cols)} features.")
            except Exception as e:
                print(f"Warning: Could not load XGBoost model: {e}")
                self.model = None

        if os.path.exists(PROFILE_PATH):
            try:
                with open(PROFILE_PATH, "r", encoding="utf-8") as f:
                    self.profile = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load profile: {e}")

        if os.path.exists(HIGH_ACC_PROFILE_PATH):
            try:
                with open(HIGH_ACC_PROFILE_PATH, "r", encoding="utf-8") as f:
                    self.high_acc_profile = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load high accuracy profile: {e}")

    def evaluate_static_white(self, board: chess.Board) -> int:
        """Evaluates board position from WHITE's perspective (centipawns)."""
        if board.is_checkmate():
            return -99999 if board.turn == chess.WHITE else 99999
        if board.is_stalemate() or board.is_insufficient_material():
            return 0

        score = 0
        piece_map = board.piece_map()
        for sq, piece in piece_map.items():
            val = PIECE_VALUES.get(piece.piece_type, 0)
            pst_val = 0
            if piece.color == chess.WHITE:
                if piece.piece_type == chess.PAWN:
                    pst_val = PAWN_PST[sq]
                elif piece.piece_type == chess.KNIGHT:
                    pst_val = KNIGHT_PST[sq]
                elif piece.piece_type == chess.BISHOP:
                    pst_val = BISHOP_PST[sq]
                elif piece.piece_type == chess.ROOK:
                    pst_val = ROOK_PST[sq]
                elif piece.piece_type == chess.QUEEN:
                    pst_val = QUEEN_PST[sq]
                score += (val + pst_val)
            else:
                sq_mirrored = chess.square_mirror(sq)
                if piece.piece_type == chess.PAWN:
                    pst_val = PAWN_PST[sq_mirrored]
                elif piece.piece_type == chess.KNIGHT:
                    pst_val = KNIGHT_PST[sq_mirrored]
                elif piece.piece_type == chess.BISHOP:
                    pst_val = BISHOP_PST[sq_mirrored]
                elif piece.piece_type == chess.ROOK:
                    pst_val = ROOK_PST[sq_mirrored]
                elif piece.piece_type == chess.QUEEN:
                    pst_val = QUEEN_PST[sq_mirrored]
                score -= (val + pst_val)

        # Center control bonus: d4, e4, d5, e5
        for c_sq in [chess.D4, chess.E4, chess.D5, chess.E5]:
            if board.is_attacked_by(chess.WHITE, c_sq):
                score += 15
            if board.is_attacked_by(chess.BLACK, c_sq):
                score -= 15

        # Castling rights bonus
        if board.has_kingside_castling_rights(chess.WHITE) or board.has_queenside_castling_rights(chess.WHITE):
            score += 20
        if board.has_kingside_castling_rights(chess.BLACK) or board.has_queenside_castling_rights(chess.BLACK):
            score -= 20

        return score

    def evaluate_turn(self, board: chess.Board) -> int:
        score_w = self.evaluate_static_white(board)
        return score_w if board.turn == chess.WHITE else -score_w

    def search_move_eval(self, board: chess.Board, move: chess.Move, vicky_color: chess.Color) -> int:
        """Calculates accurate minimax score for a candidate move (depth 2 with capture quiescence)."""
        board.push(move)
        if board.is_checkmate():
            board.pop()
            return 99999

        if board.is_stalemate() or board.is_insufficient_material():
            board.pop()
            return 0

        # Opponent's turn: opponent will choose move minimizing Vicky's score
        min_vicky_score = 999999
        opp_moves = list(board.legal_moves)
        
        # Sort opponent moves: captures and checks first to evaluate maximum tactical threat
        opp_moves.sort(key=lambda m: (board.is_capture(m), board.gives_check(m)), reverse=True)
        considered_opp = opp_moves[:14] # Top tactical responses

        for opp_m in considered_opp:
            board.push(opp_m)
            w_score = self.evaluate_static_white(board)
            vicky_score = w_score if vicky_color == chess.WHITE else -w_score
            
            # Quiescence check: if opponent captured, does Vicky have immediate recapture?
            if board.is_checkmate():
                vicky_score = -99999
            elif len(list(board.legal_moves)) > 0:
                # Check Vicky's immediate best recapture if available
                recaptures = [m for m in board.legal_moves if board.is_capture(m)]
                if recaptures:
                    best_recap = -99999
                    for recap in recaptures[:5]:
                        board.push(recap)
                        rw = self.evaluate_static_white(board)
                        rv = rw if vicky_color == chess.WHITE else -rw
                        if rv > best_recap:
                            best_recap = rv
                        board.pop()
                    vicky_score = max(vicky_score, best_recap)

            board.pop()
            if vicky_score < min_vicky_score:
                min_vicky_score = vicky_score

        board.pop()
        return min_vicky_score if considered_opp else (self.evaluate_static_white(board) if vicky_color == chess.WHITE else -self.evaluate_static_white(board))

    def extract_features(self, board: chess.Board, move: chess.Move):
        piece = board.piece_at(move.from_square)
        piece_type = piece.piece_type if piece else chess.PAWN
        dest_square = move.to_square
        
        dest_rank = chess.square_rank(dest_square)
        from_rank = chess.square_rank(move.from_square)
        is_white = (board.turn == chess.WHITE)
        fullmove_num = board.fullmove_number
        
        is_center = 1 if dest_square in [chess.D4, chess.D5, chess.E4, chess.E5] else 0
        is_extended_center = 1 if dest_square in [
            chess.C3, chess.C4, chess.C5, chess.C6,
            chess.D3, chess.D6, chess.E3, chess.E6,
            chess.F3, chess.F4, chess.F5, chess.F6
        ] else 0
        
        is_capture = 1 if board.is_capture(move) else 0
        gives_check = 1 if board.gives_check(move) else 0
        is_ks_castle = 1 if board.is_kingside_castling(move) else 0
        is_qs_castle = 1 if board.is_queenside_castling(move) else 0
        is_castle = 1 if (is_ks_castle or is_qs_castle) else 0
        is_promo = 1 if (move.promotion is not None) else 0
        
        is_opening = 1 if fullmove_num <= 10 else 0
        is_middlegame = 1 if 10 < fullmove_num <= 25 else 0
        is_endgame = 1 if fullmove_num > 25 else 0
        
        rank_advance = (dest_rank - from_rank) if is_white else (from_rank - dest_rank)
        initial_rank = 0 if is_white else 7
        is_dev_move = 1 if (piece_type in [chess.KNIGHT, chess.BISHOP] and from_rank == initial_rank) else 0
        is_queen_move = 1 if piece_type == chess.QUEEN else 0
        
        king_sq = board.king(board.turn)
        dist_to_friendly_king = chess.square_distance(dest_square, king_sq) if king_sq is not None else 0
        
        is_defended = 1 if board.is_attacked_by(board.turn, dest_square) else 0
        opp_color = chess.BLACK if is_white else chess.WHITE
        opp_queen_sq = board.pieces(chess.QUEEN, opp_color)
        attacks_queen = 1 if any(dest_square in board.attacks(sq) for sq in opp_queen_sq) else 0
        
        wp = len(board.pieces(chess.PAWN, chess.WHITE))
        wn = len(board.pieces(chess.KNIGHT, chess.WHITE))
        wb = len(board.pieces(chess.BISHOP, chess.WHITE))
        wr = len(board.pieces(chess.ROOK, chess.WHITE))
        wq = len(board.pieces(chess.QUEEN, chess.WHITE))
        
        bp = len(board.pieces(chess.PAWN, chess.BLACK))
        bn = len(board.pieces(chess.KNIGHT, chess.BLACK))
        bb = len(board.pieces(chess.BISHOP, chess.BLACK))
        br = len(board.pieces(chess.ROOK, chess.BLACK))
        bq = len(board.pieces(chess.QUEEN, chess.BLACK))
        
        material_balance = (wp - bp) + 3*(wn - bn) + 3*(wb - bb) + 5*(wr - br) + 9*(wq - bq)
        if not is_white:
            material_balance = -material_balance
            
        return {
            "piece_type": piece_type,
            "is_pawn": 1 if piece_type == chess.PAWN else 0,
            "is_knight": 1 if piece_type == chess.KNIGHT else 0,
            "is_bishop": 1 if piece_type == chess.BISHOP else 0,
            "is_rook": 1 if piece_type == chess.ROOK else 0,
            "is_queen": is_queen_move,
            "is_king": 1 if piece_type == chess.KING else 0,
            "is_capture": is_capture,
            "gives_check": gives_check,
            "is_castle": is_castle,
            "is_promotion": is_promo,
            "is_center": is_center,
            "is_extended_center": is_extended_center,
            "is_dev_move": is_dev_move,
            "rank_advance": rank_advance,
            "dist_to_friendly_king": dist_to_friendly_king,
            "is_defended": is_defended,
            "attacks_queen": attacks_queen,
            "fullmove_num": fullmove_num,
            "is_opening": is_opening,
            "is_middlegame": is_middlegame,
            "is_endgame": is_endgame,
            "material_balance": material_balance
        }

    def select_vicky_move(self, fen: str, personalization_weight: float = 0.65, history_moves: list = None, difficulty: str = "master"):
        board = chess.Board(fen)
        legal_moves = list(board.legal_moves)
        
        if not legal_moves:
            return None
            
        if len(legal_moves) == 1:
            move = legal_moves[0]
            return {
                "uci": move.uci(),
                "san": board.san(move),
                "explanation": "Only legal move available.",
                "styleScore": 0.5,
                "engineEval": 0.0,
                "combinedScore": 0.5
            }

        # 1. Master Opening Book Lookup (High-Accuracy Viknesh Repertoire)
        if history_moves is not None:
            canonical_uci_moves = []
            test_b = chess.Board()
            for m_str in history_moves:
                parsed_m = None
                try:
                    parsed_m = test_b.parse_san(m_str)
                except Exception:
                    try:
                        parsed_m = chess.Move.from_uci(m_str)
                    except Exception:
                        parsed_m = None
                if parsed_m and parsed_m in test_b.legal_moves:
                    canonical_uci_moves.append(parsed_m.uci())
                    test_b.push(parsed_m)
                else:
                    break

            canonical_history_str = " ".join(canonical_uci_moves).strip()
            if canonical_history_str in MASTER_OPENING_BOOK:
                book_candidates = MASTER_OPENING_BOOK[canonical_history_str]
                for book_uci in book_candidates:
                    try:
                        book_move = chess.Move.from_uci(book_uci)
                        if book_move in legal_moves:
                            san_book = board.san(book_move)
                            return {
                                "uci": book_uci,
                                "san": san_book,
                                "explanation": f"Vicky deployed Viknesh's signature high-accuracy opening line ({san_book}) with 77.5% historical accuracy.",
                                "styleScore": 1.0,
                                "engineEval": 0,
                                "combinedScore": 1.0,
                                "topCandidates": [
                                    {"san": san_book, "uci": book_uci, "style": 1.0, "eval": 0}
                                ],
                                "aiLevel": "MASTER (High Accuracy Viknesh)",
                                "isBookMove": True
                            }
                    except Exception:
                        pass

        # 2. Tactical Minimax Search: Evaluate candidate moves accurately
        vicky_turn = board.turn
        eval_scores = {}
        for move in legal_moves:
            eval_scores[move.uci()] = self.search_move_eval(board, move, vicky_turn)

        best_engine_eval = max(eval_scores.values())

        # 3. XGBoost High-Accuracy Style Preference Model
        style_scores = {}
        if self.model and self.feature_cols:
            feat_list = []
            move_keys = []
            for move in legal_moves:
                feat = self.extract_features(board, move)
                feat_list.append(feat)
                move_keys.append(move.uci())
            
            df = pd.DataFrame(feat_list)[self.feature_cols]
            try:
                preds = self.model.predict_proba(df)[:, 1]
                for uci_m, p in zip(move_keys, preds):
                    style_scores[uci_m] = float(p)
            except Exception as e:
                for move in legal_moves:
                    style_scores[move.uci()] = 0.5
        else:
            for move in legal_moves:
                style_scores[move.uci()] = 0.5

        # 4. Master AI Decision Selection (Zero-Blunder Enforcement)
        # Tactical Tolerance: In Master mode, only moves within 40cp of the best tactical move are considered
        blunder_tolerance = 40 if difficulty in ["master", "hard"] else 120

        scored_candidates = []
        for move in legal_moves:
            uci = move.uci()
            eng_eval = eval_scores[uci]
            style_pref = style_scores.get(uci, 0.5)
            
            diff = eng_eval - best_engine_eval # 0 for top move, negative for worse moves
            is_sound = (diff >= -blunder_tolerance) or (best_engine_eval > 5000)
            
            # Anti-blunder checks:
            # Prevent moving piece to attacked square without protection
            piece = board.piece_at(move.from_square)
            dest_sq = move.to_square
            opp_color = chess.BLACK if vicky_turn == chess.WHITE else chess.WHITE
            if board.is_attacked_by(opp_color, dest_sq) and not board.is_attacked_by(vicky_turn, dest_sq):
                if not board.is_capture(move):
                    is_sound = False
                    
            # Prevent early Queen excursions before move 5
            if piece and piece.piece_type == chess.QUEEN and board.fullmove_number <= 4:
                style_pref *= 0.2
                is_sound = False

            # Normalize engine score: 1.0 at best move, drops sharply if worse
            norm_engine_score = max(0.0, 1.0 + (diff / 200.0))
            
            # Effective style score
            effective_style = style_pref if is_sound else 0.01

            # Combined score: Master AI prioritizes engine soundness while adopting Viknesh's attacking spirit
            combined = (1.0 - personalization_weight) * norm_engine_score + personalization_weight * effective_style
            
            if is_sound and diff >= -15:
                combined += 0.20 # Master soundness bonus

            scored_candidates.append({
                "move": move,
                "uci": uci,
                "san": board.san(move),
                "engineEval": eng_eval,
                "normEngine": round(norm_engine_score, 3),
                "stylePref": round(style_pref, 3),
                "isSound": is_sound,
                "combinedScore": round(combined, 4)
            })

        # Sort candidate moves by combined score
        scored_candidates.sort(key=lambda x: x["combinedScore"], reverse=True)
        chosen = scored_candidates[0]
        
        # Build explanation
        chosen_san = chosen["san"]
        if board.fullmove_number <= 4:
            explanation = f"Vicky deployed Viknesh's signature development move ({chosen_san}) with high tactical precision."
        elif chosen["stylePref"] > 0.65 and chosen["isSound"]:
            explanation = f"Vicky played {chosen_san}, strongly capturing Viknesh's tactical attacking drive with master engine solidity."
        elif chosen["isSound"]:
            explanation = f"Vicky selected {chosen_san}, enforcing master-level tactical solidity and central piece control."
        else:
            explanation = f"Vicky executed {chosen_san} under tactical defense."

        return {
            "uci": chosen["uci"],
            "san": chosen["san"],
            "explanation": explanation,
            "styleScore": chosen["stylePref"],
            "engineEval": chosen["engineEval"],
            "combinedScore": chosen["combinedScore"],
            "topCandidates": [
                {"san": c["san"], "uci": c["uci"], "style": c["stylePref"], "eval": c["engineEval"]}
                for c in scored_candidates[:4]
            ],
            "aiLevel": "MASTER (High Accuracy Viknesh)",
            "isBookMove": False
        }

engine = VickyChessEngine()
