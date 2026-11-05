from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import shutil
import tempfile

from backend.vicky_engine import engine
from backend.analyze_dataset import analyze_pgn
from backend.train_model import train_vicky_model
from backend.db_service import (
    db_create_user as create_or_update_user,
    db_get_user as get_user_by_username,
    db_get_all_users as get_all_users,
    db_save_match as save_match,
    db_get_matches as get_user_matches,
    db_get_all_matches,
    db_delete_match as delete_match,
    db_clear_matches as clear_user_matches,
    db_save_active_game as save_active_game,
    db_get_active_game as get_active_game,
    db_clear_active_game as clear_active_game,
    db_get_leaderboard,
    get_current_db_type
)
from backend.mongo_database import is_mongo_connected, init_mongo

app = FastAPI(title="VICKY AI CHESS API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    if is_mongo_connected():
        init_mongo()
        print(">>> VICKY CHESS: MongoDB is CONNECTED and active! <<<")
    else:
        print(">>> VICKY CHESS: SQLite fallback active. <<<")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "viknesh_chess_profile.json")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "vicky_model_report.json")
PGN_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chess_com_games_2026-11-04.pgn")

HIGH_ACC_PROFILE_PATH = os.path.join(os.path.dirname(__file__), "high_accuracy_profile.json")

class MoveRequest(BaseModel):
    fen: str
    personalizationWeight: Optional[float] = 0.65
    historyMoves: Optional[List[str]] = []
    difficulty: Optional[str] = "master"
    playLikeViknesh: Optional[bool] = False

class LoginRequest(BaseModel):
    username: str

class MatchRequest(BaseModel):
    id: Optional[str] = None
    userName: Optional[str] = None
    username: Optional[str] = None
    date: Optional[str] = None
    white: Optional[str] = None
    black: Optional[str] = None
    whiteElo: Optional[str] = None
    blackElo: Optional[str] = None
    result: Optional[str] = None
    outcome: Optional[str] = None
    userColor: Optional[str] = None
    timeControl: Optional[str] = None
    termination: Optional[str] = None
    opening: Optional[str] = None
    moveCount: Optional[int] = 0
    sanHistory: Optional[List[str]] = []
    finalFen: Optional[str] = None

class ActiveGameRequest(BaseModel):
    username: str
    gameState: dict

class RegisterRequest(BaseModel):
    name: str
    username: Optional[str] = None
    rating: Optional[int] = 1500
    avatar: Optional[str] = "🦁"
    title: Optional[str] = "Challenger"

@app.post("/api/register")
def register_challenger(req: RegisterRequest):
    name = req.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    user = {
        "name": name,
        "username": (req.username or name.lower().replace(" ", "_")).strip(),
        "rating": req.rating or 1500,
        "avatar": req.avatar or "🦁",
        "title": req.title or "Challenger"
    }
    return {"status": "success", "player": user}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "VICKY AI CHESS", "aiLevel": "MASTER (High Accuracy)"}

@app.get("/api/high-accuracy-profile")
def get_high_accuracy_profile():
    if not os.path.exists(HIGH_ACC_PROFILE_PATH):
        raise HTTPException(status_code=404, detail="High accuracy profile not yet generated.")
    with open(HIGH_ACC_PROFILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/api/profile")
def get_player_profile():
    if not os.path.exists(PROFILE_PATH):
        raise HTTPException(status_code=404, detail="Profile not yet generated.")
    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/api/vicky-profile")
def get_vicky_profile():
    report_data = {}
    if os.path.exists(REPORT_PATH):
        with open(REPORT_PATH, "r", encoding="utf-8") as f:
            report_data = json.load(f)

    profile_data = {}
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            profile_data = json.load(f)

    overview = profile_data.get("overview", {})
    openings = profile_data.get("openings", {})

    return {
        "identity": {
            "name": "VICKY AI",
            "title": "Personalized AI Opponent",
            "basePlayer": "Viknesh (viknesh004)",
            "description": "Trained on Viknesh's historical Chess.com games. Vicky captures Viknesh's bold, tactical playstyle and opening repertoire while using hybrid engine pruning to avoid his common historical blunders.",
            "avatar": "brain-circuit"
        },
        "modelStatus": {
            "trained": report_data.get("status") == "TRAINED",
            "algorithm": report_data.get("modelType", "XGBoost Classifier & Ranker"),
            "trainingGamesCount": report_data.get("trainGamesCount", 352),
            "validationGamesCount": report_data.get("valGamesCount", 89),
            "totalGames": overview.get("totalGames", 443),
            "validationAuc": report_data.get("metrics", {}).get("validationAuc", 0.766),
            "binaryAccuracy": report_data.get("metrics", {}).get("binaryAccuracy", 79.04),
            "top1Accuracy": report_data.get("metrics", {}).get("top1MoveRankAccuracy", 26.02),
            "top3Accuracy": report_data.get("metrics", {}).get("top3MoveRankAccuracy", 49.77),
        },
        "learnedRepertoire": {
            "asWhite": [
                {"move": "1. e3", "description": "Signature White opening played 180+ times, preparing solid central pawn pawn structures."},
                {"move": "1. e4", "description": "Aggressive King's Pawn opening for rapid piece development and sharp open lines."}
            ],
            "asBlack": [
                {"move": "1... e6", "description": "Signature French Defense played 170+ times, creating resilient counter-attacking pawn chains."},
                {"move": "1... e5", "description": "Direct classical response challenging central space."}
            ]
        },
        "styleComparison": [
            {
                "attribute": "Opening Choices",
                "viknesh": "Strict adherence to 1. e3 as White and 1... e6 French as Black",
                "vicky": "Adopts Viknesh's favorite French and solid structures with enhanced theoretical development",
                "improvement": "Eliminates passive setups"
            },
            {
                "attribute": "Early Queen Usage",
                "viknesh": "Tendency to develop Queen early (e.g. 2. Qf3 or 3. Qh5) resulting in lost tempos",
                "vicky": "Prioritizes minor piece development first; filters out premature Queen attacks",
                "improvement": "Prevents early tempo loss & traps"
            },
            {
                "attribute": "Tactical Aggression",
                "viknesh": "High capture drive and willingness to deliver checks",
                "vicky": "Retains Viknesh's sharp tactical attacking spirit, but verifies tactical safety with engine",
                "improvement": "Only strikes when sound"
            },
            {
                "attribute": "King Safety & Castling",
                "viknesh": "Over 85% kingside castling, but occasionally delayed leaving King in center",
                "vicky": "Castles efficiently on move 7-10 to safeguard the king against counter-attacks",
                "improvement": "Shielded king in center"
            },
            {
                "attribute": "Endgame Conversion",
                "viknesh": "Aggressive pawn promotion, occasional stalemate traps",
                "vicky": "Precise endgame technique, king centralization, avoiding accidental stalemates",
                "improvement": "Flawless technical conversion"
            }
        ],
        "featureImportances": report_data.get("featureImportances", []),
        "styleFindings": report_data.get("styleFindings", [])
    }

@app.post("/api/vicky-move")
def calculate_move(req: MoveRequest):
    try:
        pw = 1.0 if req.playLikeViknesh else (req.personalizationWeight if req.personalizationWeight is not None else 0.65)
        diff = "viknesh" if req.playLikeViknesh else (req.difficulty or "master")
        result = engine.select_vicky_move(
            fen=req.fen,
            personalization_weight=pw,
            history_moves=req.historyMoves,
            difficulty=diff,
            play_like_viknesh=bool(req.playLikeViknesh)
        )
        if not result:
            raise HTTPException(status_code=400, detail="No legal moves available from this position.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine calculation error: {str(e)}")

@app.get("/api/games")
def get_all_games():
    if not os.path.exists(PROFILE_PATH):
        raise HTTPException(status_code=404, detail="Games not available.")
    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {
        "total": len(data.get("allGames", [])),
        "games": data.get("allGames", [])
    }

@app.post("/api/import-pgn")
async def import_pgn_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".pgn"):
        raise HTTPException(status_code=400, detail="Only .pgn files are accepted.")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Save to a temporary location to parse and validate
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    try:
        with open(temp_path, "wb") as f:
            f.write(contents)

        # Parse new PGN
        new_profile = analyze_pgn(temp_path)
        
        # Merge or overwrite master dataset if valid
        return {
            "status": "success",
            "message": f"Successfully parsed {new_profile['datasetInfo']['totalGamesParsed']} games.",
            "totalGames": new_profile['datasetInfo']['totalGamesParsed'],
            "parseErrors": new_profile['datasetInfo']['parseErrorsCount'],
            "overview": new_profile['overview']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PGN Import failed: {str(e)}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/api/retrain")
def retrain_model():
    try:
        report = train_vicky_model()
        engine.load_resources()
        return {
            "status": "success",
            "message": "Vicky XGBoost model retrained successfully.",
            "metrics": report["metrics"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

# ==========================================
# DATABASE REST API ENDPOINTS (Dual MongoDB / SQLite)
# ==========================================

@app.get("/api/db/status")
def db_status():
    db_type = get_current_db_type()
    mongo_active = is_mongo_connected()
    return {
        "status": "online",
        "activeDatabase": db_type,
        "mongoConnected": mongo_active,
        "sqliteFallbackReady": True
    }

@app.post("/api/db/register")
def db_register(req: RegisterRequest):
    name = req.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters.")
    username = (req.username or name.lower().replace(" ", "_")).strip().lower()
    user = create_or_update_user(
        name=name,
        username=username,
        rating=req.rating or 1200,
        avatar=req.avatar or "🦁",
        title=req.title or "Challenger"
    )
    return {"status": "success", "user": user}

@app.post("/api/db/login")
def db_login(req: LoginRequest):
    clean = req.username.strip().lower()
    user = get_user_by_username(clean)
    if not user:
        raise HTTPException(status_code=404, detail=f"No registered account found matching '{req.username}'.")
    return {"status": "success", "user": user}

@app.get("/api/db/users")
def db_get_users():
    users = get_all_users()
    return {"status": "success", "users": users}

@app.post("/api/db/matches")
def db_save_match(req: MatchRequest):
    data = req.model_dump()
    result = save_match(data)
    return {"status": "success", "match": result}

@app.get("/api/db/matches")
def db_get_all_matches_route():
    matches = db_get_all_matches()
    return {"status": "success", "matches": matches}

@app.get("/api/db/matches/{username}")
def db_get_matches(username: str):
    matches = get_user_matches(username)
    return {"status": "success", "matches": matches}

@app.delete("/api/db/matches/{match_id}")
def db_delete_match(match_id: str):
    deleted = delete_match(match_id)
    return {"status": "success", "deleted": deleted}

@app.delete("/api/db/matches/user/{username}")
def db_clear_user_matches(username: str):
    count = clear_user_matches(username)
    return {"status": "success", "deletedCount": count}

@app.post("/api/db/active-game")
def db_save_active_game(req: ActiveGameRequest):
    saved = save_active_game(req.username, req.gameState)
    return {"status": "success", "saved": saved}

@app.get("/api/db/active-game/{username}")
def db_get_active_game(username: str):
    game = get_active_game(username)
    return {"status": "success", "activeGame": game}

@app.delete("/api/db/active-game/{username}")
def db_clear_active_game(username: str):
    cleared = clear_active_game(username)
    return {"status": "success", "cleared": cleared}

@app.get("/api/db/leaderboard")
def get_leaderboard_route():
    board = db_get_leaderboard()
    return {
        "status": "success",
        "database": get_current_db_type(),
        "totalPlayers": len(board),
        "leaderboard": board
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

