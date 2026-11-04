import os
import json
import time
from typing import List, Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# MongoDB URI: Can be local (mongodb://127.0.0.1:27017) or MongoDB Atlas (mongodb+srv://<user>:<password>@cluster.mongodb.net)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "vicky_chess_db")

_client = None

def get_mongo_client():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    return _client

def get_mongo_db():
    client = get_mongo_client()
    return client[DB_NAME]

def is_mongo_connected() -> bool:
    try:
        client = get_mongo_client()
        client.admin.command('ping')
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError, Exception):
        return False

def init_mongo():
    """Ensure indexes on users, matches, and active_games collections, and sync from SQLite."""
    try:
        db = get_mongo_db()
        db.users.create_index("username", unique=True)
        db.matches.create_index("id", unique=True)
        db.matches.create_index("username")
        db.active_games.create_index("username", unique=True)

        # Sync existing users from SQLite if any
        try:
            from backend.database import get_all_users as sqlite_get_all_users, get_user_matches as sqlite_get_user_matches
            sqlite_users = sqlite_get_all_users()
            for u in sqlite_users:
                uname = u.get("username")
                if uname and not db.users.find_one({"username": uname.strip().lower()}):
                    mongo_create_or_update_user(
                        name=u.get("name") or uname,
                        username=uname,
                        rating=int(u.get("rating") or 1200),
                        avatar=u.get("avatar") or "🦁",
                        title=u.get("title") or "Challenger"
                    )
        except Exception as sync_err:
            print("SQLite sync notice:", sync_err)

        return True
    except Exception as e:
        print(f"MongoDB not reachable yet ({e}). Fallback to SQLite is active.")
        return False

# --- User Management ---

def mongo_create_or_update_user(name: str, username: str, rating: int = 1200, avatar: str = '🦁', title: str = 'Challenger') -> Dict[str, Any]:
    db = get_mongo_db()
    clean_username = username.strip().lower()
    clean_name = name.strip()

    user_doc = {
        "name": clean_name,
        "username": clean_username,
        "rating": rating,
        "avatar": avatar,
        "title": title,
        "updatedAt": time.time()
    }

    db.users.update_one(
        {"username": clean_username},
        {"$set": user_doc, "$setOnInsert": {"createdAt": time.time()}},
        upsert=True
    )

    found = db.users.find_one({"username": clean_username}, {"_id": 0})
    return found or user_doc

def mongo_get_user(username: str) -> Optional[Dict[str, Any]]:
    db = get_mongo_db()
    clean = username.strip().lower()
    user = db.users.find_one(
        {"$or": [{"username": clean}, {"name": {"$regex": f"^{clean}$", "$options": "i"}}]},
        {"_id": 0}
    )
    return user

def mongo_get_all_users() -> List[Dict[str, Any]]:
    db = get_mongo_db()
    users = list(db.users.find({}, {"_id": 0}).sort("createdAt", -1))
    return users

# --- Match Management ---

def mongo_save_match(match_data: Dict[str, Any]) -> Dict[str, Any]:
    db = get_mongo_db()
    match_id = str(match_data.get("id") or f"match_{int(time.time() * 1000)}")
    username = str(match_data.get("userName") or match_data.get("username") or "player").strip().lower()

    doc = {
        "id": match_id,
        "username": username,
        "userName": username,
        "date": str(match_data.get("date") or "Today"),
        "white": str(match_data.get("white") or "Player"),
        "black": str(match_data.get("black") or "Vicky AI"),
        "whiteElo": str(match_data.get("whiteElo") or "1200"),
        "blackElo": str(match_data.get("blackElo") or "2200"),
        "result": str(match_data.get("result") or "1-0"),
        "outcome": str(match_data.get("outcome") or "win"),
        "userColor": str(match_data.get("userColor") or "white"),
        "timeControl": str(match_data.get("timeControl") or "10+0 Rapid"),
        "termination": str(match_data.get("termination") or "Normal"),
        "opening": str(match_data.get("opening") or "Standard"),
        "moveCount": int(match_data.get("moveCount") or 0),
        "sanHistory": match_data.get("sanHistory") or [],
        "finalFen": str(match_data.get("finalFen") or ""),
        "createdAt": time.time()
    }

    db.matches.update_one({"id": match_id}, {"$set": doc}, upsert=True)
    return {"id": match_id, "status": "saved", "database": "mongodb"}

def mongo_get_user_matches(username: str) -> List[Dict[str, Any]]:
    db = get_mongo_db()
    clean = username.strip().lower()
    matches = list(db.matches.find(
        {"$or": [
            {"username": clean},
            {"white": {"$regex": clean, "$options": "i"}},
            {"black": {"$regex": clean, "$options": "i"}}
        ]},
        {"_id": 0}
    ).sort("createdAt", -1))
    return matches

def mongo_get_all_matches(limit: int = 100) -> List[Dict[str, Any]]:
    db = get_mongo_db()
    matches = list(db.matches.find({}, {"_id": 0}).sort("createdAt", -1).limit(limit))
    return matches

def mongo_delete_match(match_id: str) -> bool:
    db = get_mongo_db()
    res = db.matches.delete_one({"id": match_id})
    return res.deleted_count > 0

def mongo_clear_user_matches(username: str) -> int:
    db = get_mongo_db()
    clean = username.strip().lower()
    res = db.matches.delete_many(
        {"$or": [
            {"username": clean},
            {"white": {"$regex": clean, "$options": "i"}},
            {"black": {"$regex": clean, "$options": "i"}}
        ]}
    )
    return res.deleted_count

# --- Active Games Management ---

def mongo_save_active_game(username: str, game_state: Dict[str, Any]) -> bool:
    try:
        db = get_mongo_db()
        clean = username.strip().lower()
        doc = {
            "username": clean,
            "gameState": game_state,
            "updatedAt": time.time()
        }
        db.active_games.update_one({"username": clean}, {"$set": doc}, upsert=True)
        return True
    except Exception as e:
        print("MongoDB save active game error:", e)
        return False

def mongo_get_active_game(username: str) -> Optional[Dict[str, Any]]:
    try:
        db = get_mongo_db()
        clean = username.strip().lower()
        doc = db.active_games.find_one({"username": clean}, {"_id": 0})
        if doc and "gameState" in doc:
            return doc["gameState"]
        return None
    except Exception as e:
        print("MongoDB get active game error:", e)
        return None

def mongo_clear_active_game(username: str) -> bool:
    try:
        db = get_mongo_db()
        clean = username.strip().lower()
        res = db.active_games.delete_one({"username": clean})
        return res.deleted_count > 0
    except Exception as e:
        print("MongoDB clear active game error:", e)
        return False

# --- Leaderboard Management ---

def mongo_get_leaderboard() -> List[Dict[str, Any]]:
    db = get_mongo_db()
    users = list(db.users.find({}, {"_id": 0}))
    leaderboard = []

    for u in users:
        clean = (u.get("username") or "").strip().lower()
        name = u.get("name") or clean
        matches = list(db.matches.find(
            {"$or": [
                {"username": clean},
                {"userName": clean},
                {"white": {"$regex": f"^{name}$|^{clean}$", "$options": "i"}},
                {"black": {"$regex": f"^{name}$|^{clean}$", "$options": "i"}}
            ]}
        ).sort("createdAt", -1))

        total = len(matches)
        wins = sum(1 for m in matches if str(m.get("outcome") or "").lower() == "win")
        losses = sum(1 for m in matches if str(m.get("outcome") or "").lower() == "loss")
        draws = sum(1 for m in matches if str(m.get("outcome") or "").lower() == "draw")
        win_rate = round((wins / total * 100), 1) if total > 0 else 0.0

        form = [str(m.get("outcome") or "W")[0].upper() for m in matches[:5]]

        leaderboard.append({
            "username": clean,
            "name": name,
            "rating": int(u.get("rating") or 1200),
            "avatar": u.get("avatar") or "🦁",
            "title": u.get("title") or "Challenger",
            "totalMatches": total,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "winRate": win_rate,
            "form": form,
            "createdAt": u.get("createdAt")
        })

    leaderboard.sort(key=lambda x: (x["rating"], x["winRate"], x["wins"], x["totalMatches"]), reverse=True)
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1

    return leaderboard
