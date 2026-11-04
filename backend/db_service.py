import os
from typing import List, Dict, Any, Optional

from backend.database import (
    create_or_update_user as sqlite_create_user,
    get_user_by_username as sqlite_get_user,
    get_all_users as sqlite_get_all_users,
    save_match as sqlite_save_match,
    get_user_matches as sqlite_get_matches,
    get_all_matches as sqlite_get_all_matches,
    delete_match as sqlite_delete_match,
    clear_user_matches as sqlite_clear_matches,
    save_active_game as sqlite_save_active,
    get_active_game as sqlite_get_active,
    clear_active_game as sqlite_clear_active,
    get_leaderboard as sqlite_get_leaderboard
)

from backend.mongo_database import (
    is_mongo_connected,
    init_mongo,
    mongo_create_or_update_user,
    mongo_get_user,
    mongo_get_all_users,
    mongo_save_match,
    mongo_get_user_matches,
    mongo_get_all_matches,
    mongo_delete_match,
    mongo_clear_user_matches,
    mongo_save_active_game,
    mongo_get_active_game,
    mongo_clear_active_game,
    mongo_get_leaderboard
)

def get_current_db_type() -> str:
    """Returns 'mongodb' if MongoDB is accessible, else 'sqlite'."""
    if os.getenv("USE_SQLITE_ONLY", "").lower() in ("1", "true"):
        return "sqlite"
    if is_mongo_connected():
        return "mongodb"
    return "sqlite"

# --- Unified DB Service Functions ---

def db_create_user(name: str, username: str, rating: int = 1200, avatar: str = '🦁', title: str = 'Challenger') -> Dict[str, Any]:
    if get_current_db_type() == "mongodb":
        try:
            return mongo_create_or_update_user(name, username, rating, avatar, title)
        except Exception as e:
            print("MongoDB write error, falling back to SQLite:", e)
    return sqlite_create_user(name, username, rating, avatar, title)

def db_get_user(username: str) -> Optional[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            res = mongo_get_user(username)
            if res:
                return res
        except Exception as e:
            print("MongoDB read error, falling back to SQLite:", e)
    return sqlite_get_user(username)

def db_get_all_users() -> List[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            return mongo_get_all_users()
        except Exception as e:
            print("MongoDB read error, falling back to SQLite:", e)
    return sqlite_get_all_users()

def db_save_match(match_data: Dict[str, Any]) -> Dict[str, Any]:
    # Always save to SQLite for local guarantee
    sqlite_res = sqlite_save_match(match_data)
    if get_current_db_type() == "mongodb":
        try:
            mongo_save_match(match_data)
            return {"status": "saved", "database": "mongodb & sqlite"}
        except Exception as e:
            print("MongoDB save error:", e)
    return sqlite_res

def db_get_matches(username: str) -> List[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            matches = mongo_get_user_matches(username)
            if matches:
                return matches
        except Exception as e:
            print("MongoDB read error:", e)
    return sqlite_get_matches(username)

def db_get_all_matches(limit: int = 100) -> List[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            return mongo_get_all_matches(limit)
        except Exception as e:
            print("MongoDB read all error:", e)
    return sqlite_get_all_matches(limit)

def db_delete_match(match_id: str) -> bool:
    if get_current_db_type() == "mongodb":
        try:
            mongo_delete_match(match_id)
        except:
            pass
    return sqlite_delete_match(match_id)

def db_clear_matches(username: str) -> int:
    if get_current_db_type() == "mongodb":
        try:
            mongo_clear_user_matches(username)
        except:
            pass
    return sqlite_clear_matches(username)

def db_save_active_game(username: str, game_state: Dict[str, Any]) -> bool:
    if get_current_db_type() == "mongodb":
        try:
            mongo_save_active_game(username, game_state)
        except Exception as e:
            print("MongoDB active game error:", e)
    return sqlite_save_active(username, game_state)

def db_get_active_game(username: str) -> Optional[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            active = mongo_get_active_game(username)
            if active:
                return active
        except Exception as e:
            print("MongoDB get active error:", e)
    return sqlite_get_active(username)

def db_clear_active_game(username: str) -> bool:
    if get_current_db_type() == "mongodb":
        try:
            mongo_clear_active_game(username)
        except:
            pass
    return sqlite_clear_active(username)

def db_get_leaderboard() -> List[Dict[str, Any]]:
    if get_current_db_type() == "mongodb":
        try:
            return mongo_get_leaderboard()
        except Exception as e:
            print("MongoDB leaderboard error:", e)
    return sqlite_get_leaderboard()

