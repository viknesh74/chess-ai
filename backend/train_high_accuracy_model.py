import json
import os
import random
import chess
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, roc_auc_score, precision_score, recall_score

INPUT_POSITIONS_PATH = os.path.join(os.path.dirname(__file__), "high_accuracy_training_positions.json")
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "vicky_high_accuracy_model.json")
REPORT_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "vicky_high_accuracy_report.json")
FRONTEND_REPORT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "src", "data", "vicky_high_accuracy_report.json")

def extract_advanced_features(board: chess.Board, move: chess.Move, is_white: bool, fullmove_num: int):
    piece = board.piece_at(move.from_square)
    piece_type = piece.piece_type if piece else chess.PAWN
    dest_square = move.to_square
    
    dest_file = chess.square_file(dest_square)
    dest_rank = chess.square_rank(dest_square)
    from_file = chess.square_file(move.from_square)
    from_rank = chess.square_rank(move.from_square)
    
    # Center control: d4, d5, e4, e5
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
    
    # Phase
    is_opening = 1 if fullmove_num <= 10 else 0
    is_middlegame = 1 if 10 < fullmove_num <= 25 else 0
    is_endgame = 1 if fullmove_num > 25 else 0
    
    # Advancement
    rank_advance = (dest_rank - from_rank) if is_white else (from_rank - dest_rank)
    
    # Development: minor piece moving from initial rank
    initial_rank = 0 if is_white else 7
    is_dev_move = 1 if (piece_type in [chess.KNIGHT, chess.BISHOP] and from_rank == initial_rank) else 0
    is_queen_move = 1 if piece_type == chess.QUEEN else 0
    
    # King safety & shelter
    king_sq = board.king(board.turn)
    dist_to_friendly_king = chess.square_distance(dest_square, king_sq) if king_sq is not None else 0
    
    # Defended destination square check
    is_defended = 1 if board.is_attacked_by(board.turn, dest_square) else 0
    
    # Attacks on opponent queen or king
    opp_color = chess.BLACK if is_white else chess.WHITE
    opp_queen_sq = board.pieces(chess.QUEEN, opp_color)
    attacks_queen = 1 if any(dest_square in board.attacks(sq) for sq in opp_queen_sq) else 0
    
    # Material counts
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

def train_high_accuracy_vicky():
    print(f"Loading high accuracy training positions from {INPUT_POSITIONS_PATH}...")
    with open(INPUT_POSITIONS_PATH, "r", encoding="utf-8") as f:
        positions = json.load(f)
        
    print(f"Loaded {len(positions)} positions.")
    
    game_ids = list(set(p["game_id"] for p in positions))
    random.seed(42)
    random.shuffle(game_ids)
    
    # Strict 80/20 train/val split by game_id to avoid data leakage
    split_idx = int(len(game_ids) * 0.8)
    train_games = set(game_ids[:split_idx])
    val_games = set(game_ids[split_idx:])
    
    print(f"Training games: {len(train_games)} | Validation games: {len(val_games)}")
    
    train_rows = []
    val_rows = []
    train_weights = []
    val_eval_positions = []
    
    for pos in positions:
        fen = pos["fen"]
        chosen_move_uci = pos["chosen_move"]
        legal_moves_uci = pos["legal_moves"]
        fullmove_num = pos["fullmove_number"]
        is_white = pos["is_white"]
        gid = pos["game_id"]
        sample_w = pos.get("sample_weight", 1.0)
        is_val = gid in val_games
        
        board = chess.Board(fen)
        try:
            chosen_m = chess.Move.from_uci(chosen_move_uci)
        except Exception:
            continue
            
        pos_feat = extract_advanced_features(board, chosen_m, is_white, fullmove_num)
        pos_feat["target"] = 1
        pos_feat["game_id"] = gid
        
        if is_val:
            val_rows.append(pos_feat)
        else:
            train_rows.append(pos_feat)
            train_weights.append(sample_w)
            
        other_legal = [m for m in legal_moves_uci if m != chosen_move_uci]
        sampled_negatives = random.sample(other_legal, min(3, len(other_legal))) if not is_val else other_legal
        
        for neg_uci in sampled_negatives:
            try:
                neg_m = chess.Move.from_uci(neg_uci)
                neg_feat = extract_advanced_features(board, neg_m, is_white, fullmove_num)
                neg_feat["target"] = 0
                neg_feat["game_id"] = gid
                
                if is_val:
                    val_rows.append(neg_feat)
                else:
                    train_rows.append(neg_feat)
                    train_weights.append(1.0) # Standard negative weight
            except Exception:
                continue
                
        if is_val:
            val_eval_positions.append({
                "chosen_uci": chosen_move_uci,
                "candidates": [(chosen_move_uci, pos_feat)] + [
                    (cand_uci, extract_advanced_features(board, chess.Move.from_uci(cand_uci), is_white, fullmove_num))
                    for cand_uci in other_legal
                ]
            })

    train_df = pd.DataFrame(train_rows)
    val_df = pd.DataFrame(val_rows)
    feature_cols = [c for c in train_df.columns if c not in ["target", "game_id"]]
    
    print(f"Features ({len(feature_cols)}): {feature_cols}")
    print(f"Training samples: {len(train_df)} | Validation samples: {len(val_df)}")
    
    X_train = train_df[feature_cols]
    y_train = train_df["target"]
    weights_train = np.array(train_weights)
    
    X_val = val_df[feature_cols]
    y_val = val_df["target"]
    
    print("Training High-Accuracy XGBoost Master Model...")
    scale_pos = (len(y_train) - sum(y_train)) / max(1, sum(y_train))
    model = xgb.XGBClassifier(
        n_estimators=160,
        max_depth=6,
        learning_rate=0.07,
        scale_pos_weight=scale_pos,
        subsample=0.88,
        colsample_bytree=0.88,
        random_state=42,
        eval_metric="logloss"
    )
    
    model.fit(
        X_train,
        y_train,
        sample_weight=weights_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    val_preds_prob = model.predict_proba(X_val)[:, 1]
    val_preds_binary = (val_preds_prob >= 0.5).astype(int)
    
    val_acc = accuracy_score(y_val, val_preds_binary)
    val_auc = roc_auc_score(y_val, val_preds_prob)
    val_precision = precision_score(y_val, val_preds_binary, zero_division=0)
    val_recall = recall_score(y_val, val_preds_binary, zero_division=0)
    
    print(f"High-Accuracy Model Validation AUC: {val_auc:.4f} | Binary Accuracy: {val_acc:.4f}")
    
    # Evaluate Top-1 and Top-3 accuracy on unseen positions
    top1_correct = 0
    top3_correct = 0
    total_eval = len(val_eval_positions)
    
    for item in val_eval_positions:
        chosen = item["chosen_uci"]
        cands = item["candidates"]
        cand_df = pd.DataFrame([c[1] for c in cands])[feature_cols]
        scores = model.predict_proba(cand_df)[:, 1]
        
        ranked_moves = [move_uci for _, move_uci in sorted(zip(scores, [c[0] for c in cands]), reverse=True)]
        if ranked_moves and ranked_moves[0] == chosen:
            top1_correct += 1
        if chosen in ranked_moves[:3]:
            top3_correct += 1
            
    top1_acc = round((top1_correct / max(1, total_eval)) * 100, 2)
    top3_acc = round((top3_correct / max(1, total_eval)) * 100, 2)
    
    print(f"High-Accuracy Top-1 Accuracy: {top1_acc}% | Top-3 Accuracy: {top3_acc}% across {total_eval} unseen positions")
    
    # Save model and update live files
    model.save_model(MODEL_OUTPUT_PATH)
    # Also overwrite the primary vicky_xgboost_model.json so the engine automatically uses this superior model
    PRIMARY_MODEL_PATH = os.path.join(os.path.dirname(__file__), "vicky_xgboost_model.json")
    model.save_model(PRIMARY_MODEL_PATH)
    print(f"Saved High-Accuracy model to {MODEL_OUTPUT_PATH} and {PRIMARY_MODEL_PATH}")
    
    importances = model.feature_importances_
    feat_importance_list = sorted(
        [{"feature": col, "importance": round(float(imp), 4)} for col, imp in zip(feature_cols, importances)],
        key=lambda x: x["importance"],
        reverse=True
    )
    
    report = {
        "status": "TRAINED",
        "modelType": "XGBoost Master Move Ranker (High Accuracy Peak Viknesh)",
        "highAccuracyGamesUsed": 192,
        "totalGamesDataset": len(game_ids),
        "trainGamesCount": len(train_games),
        "valGamesCount": len(val_games),
        "trainPositionsSampled": len(train_df),
        "valPositionsSampled": len(val_df),
        "metrics": {
            "validationAuc": round(float(val_auc), 4),
            "binaryAccuracy": round(float(val_acc) * 100, 2),
            "top1MoveRankAccuracy": top1_acc,
            "top3MoveRankAccuracy": top3_acc,
            "precision": round(float(val_precision), 4),
            "recall": round(float(val_recall), 4)
        },
        "featureImportances": feat_importance_list,
        "featureColumns": feature_cols,
        "tuningHighlights": [
            "Trained specifically on Viknesh's 192 high-accuracy games (77.5% average accuracy)",
            "Sample weight bonus (3.5x) applied to peak winning decisions",
            "Incorporated destination square defense, queen attack pressure, and central dominance",
            "Coupled with Stockfish 18 tactical master pruning for hard AI level play"
        ]
    }
    
    with open(REPORT_OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved High-Accuracy Report to {REPORT_OUTPUT_PATH}")
    
    with open(FRONTEND_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved Frontend Report to {FRONTEND_REPORT_PATH}")
    
    # Overwrite primary reports as well
    PRIMARY_REPORT = os.path.join(os.path.dirname(__file__), "vicky_model_report.json")
    FRONTEND_PRIMARY_REPORT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "src", "data", "vicky_model_report.json")
    with open(PRIMARY_REPORT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    with open(FRONTEND_PRIMARY_REPORT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    return report

if __name__ == "__main__":
    train_high_accuracy_vicky()

