import sqlite3
import os
import json
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "vicky_chess.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        rating INTEGER DEFAULT 1200,
        avatar TEXT DEFAULT '🦁',
        title TEXT DEFAULT 'Challenger',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Matches Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        date TEXT NOT NULL,
        white TEXT NOT NULL,
        black TEXT NOT NULL,
        white_elo TEXT,
        black_elo TEXT,
        result TEXT NOT NULL,
        outcome TEXT NOT NULL,
        user_color TEXT NOT NULL,
        time_control TEXT DEFAULT '10+0 Rapid',
        termination TEXT,
        opening TEXT,
        move_count INTEGER DEFAULT 0,
        san_history TEXT,
        final_fen TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Active Games Table (per user game state)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS active_games (
        username TEXT PRIMARY KEY,
        fen TEXT NOT NULL,
        player_time REAL DEFAULT 600,
        vicky_time REAL DEFAULT 600,
        player_color TEXT DEFAULT 'w',
        san_moves TEXT,
        history_fens TEXT,
        last_move TEXT,
        score_centipawns INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

# --- User Management ---

def create_or_update_user(name: str, username: str, rating: int = 1200, avatar: str = '🦁', title: str = 'Challenger') -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    clean_username = username.strip().lower()
    clean_name = name.strip()

    cursor.execute("""
    INSERT INTO users (name, username, rating, avatar, title)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
        name=excluded.name,
        rating=excluded.rating,
        avatar=excluded.avatar,
        title=excluded.title
    """, (clean_name, clean_username, rating, avatar, title))

    conn.commit()

    cursor.execute("SELECT id, name, username, rating, avatar, title, created_at FROM users WHERE username = ?", (clean_username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()
    cursor.execute("SELECT id, name, username, rating, avatar, title, created_at FROM users WHERE username = ? OR LOWER(name) = ?", (clean, clean))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, username, rating, avatar, title, created_at FROM users ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Matches Management ---

def save_match(match_data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    match_id = str(match_data.get("id") or f"match_{int(__import__('time').time() * 1000)}")
    username = str(match_data.get("userName") or match_data.get("username") or "player").strip().lower()
    date_str = str(match_data.get("date") or "Today")
    white = str(match_data.get("white") or "Player")
    black = str(match_data.get("black") or "Vicky AI")
    white_elo = str(match_data.get("whiteElo") or "1200")
    black_elo = str(match_data.get("blackElo") or "2200")
    result = str(match_data.get("result") or "1-0")
    outcome = str(match_data.get("outcome") or "win")
    user_color = str(match_data.get("userColor") or "white")
    time_control = str(match_data.get("timeControl") or "10+0 Rapid")
    termination = str(match_data.get("termination") or "Normal")
    opening = str(match_data.get("opening") or "Standard")
    move_count = int(match_data.get("moveCount") or 0)
    san_history = json.dumps(match_data.get("sanHistory") or [])
    final_fen = str(match_data.get("finalFen") or "")

    cursor.execute("""
    INSERT OR REPLACE INTO matches (
        id, username, date, white, black, white_elo, black_elo,
        result, outcome, user_color, time_control, termination,
        opening, move_count, san_history, final_fen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        match_id, username, date_str, white, black, white_elo, black_elo,
        result, outcome, user_color, time_control, termination,
        opening, move_count, san_history, final_fen
    ))

    conn.commit()
    conn.close()
    return {"id": match_id, "status": "saved"}

def get_user_matches(username: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()

    cursor.execute("""
    SELECT * FROM matches 
    WHERE username = ? OR LOWER(white) LIKE ? OR LOWER(black) LIKE ?
    ORDER BY created_at DESC
    """, (clean, f"%{clean}%", f"%{clean}%"))

    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        item = dict(r)
        try:
            item["sanHistory"] = json.loads(item.get("san_history") or "[]")
        except:
            item["sanHistory"] = []
        item["userName"] = item.get("username")
        item["whiteElo"] = item.get("white_elo")
        item["blackElo"] = item.get("black_elo")
        item["userColor"] = item.get("user_color")
        item["timeControl"] = item.get("time_control")
        item["moveCount"] = item.get("move_count")
        item["finalFen"] = item.get("final_fen")
        result.append(item)
    return result

def get_all_matches(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM matches ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        item = dict(r)
        try:
            item["sanHistory"] = json.loads(item.get("san_history") or "[]")
        except:
            item["sanHistory"] = []
        item["moveCount"] = item.get("move_count")
        item["userColor"] = item.get("user_color")
        item["timeControl"] = item.get("time_control")
        item["whiteElo"] = item.get("white_elo")
        item["blackElo"] = item.get("black_elo")
        item["finalFen"] = item.get("final_fen")
        result.append(item)
    return result

def delete_match(match_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM matches WHERE id = ?", (match_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

def clear_user_matches(username: str) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()
    cursor.execute("DELETE FROM matches WHERE username = ? OR LOWER(white) LIKE ? OR LOWER(black) LIKE ?", (clean, f"%{clean}%", f"%{clean}%"))
    conn.commit()
    count = cursor.rowcount
    conn.close()
    return count

# --- Active Games Management ---

def save_active_game(username: str, game_state: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()

    fen = game_state.get("fen", "")
    player_time = float(game_state.get("playerTime", 600))
    vicky_time = float(game_state.get("vickyTime", 600))
    player_color = game_state.get("playerColor", "w")
    san_moves = json.dumps(game_state.get("sanMoves", []))
    history_fens = json.dumps(game_state.get("historyFens", []))
    last_move = json.dumps(game_state.get("lastMove", None))
    score = int(game_state.get("scoreCentipawns", 0))

    cursor.execute("""
    INSERT OR REPLACE INTO active_games (
        username, fen, player_time, vicky_time, player_color,
        san_moves, history_fens, last_move, score_centipawns, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (clean, fen, player_time, vicky_time, player_color, san_moves, history_fens, last_move, score))

    conn.commit()
    conn.close()
    return True

def get_active_game(username: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()

    cursor.execute("SELECT * FROM active_games WHERE username = ?", (clean,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    item = dict(row)
    try:
        item["sanMoves"] = json.loads(item.get("san_moves") or "[]")
        item["historyFens"] = json.loads(item.get("history_fens") or "[]")
        item["lastMove"] = json.loads(item.get("last_move") or "null")
    except:
        pass
    item["playerTime"] = item.get("player_time")
    item["vickyTime"] = item.get("vicky_time")
    item["playerColor"] = item.get("player_color")
    item["scoreCentipawns"] = item.get("score_centipawns")
    return item

def clear_active_game(username: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    clean = username.strip().lower()
    cursor.execute("DELETE FROM active_games WHERE username = ?", (clean,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted

# --- Leaderboard Management ---

def get_leaderboard() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = [dict(r) for r in cursor.fetchall()]
    
    leaderboard = []
    for u in users:
        uname = u["username"]
        cursor.execute("SELECT outcome FROM matches WHERE username = ? OR white = ? OR black = ?", (uname, u["name"], u["name"]))
        matches = cursor.fetchall()
        total = len(matches)
        wins = sum(1 for m in matches if (m["outcome"] or "").lower() == "win")
        losses = sum(1 for m in matches if (m["outcome"] or "").lower() == "loss")
        draws = sum(1 for m in matches if (m["outcome"] or "").lower() == "draw")
        win_rate = round((wins / total * 100), 1) if total > 0 else 0.0
        
        cursor.execute("SELECT outcome FROM matches WHERE username = ? ORDER BY created_at DESC LIMIT 5", (uname,))
        recent = cursor.fetchall()
        form = [(r["outcome"] or "win")[0].upper() for r in recent]

        leaderboard.append({
            "username": uname,
            "name": u["name"],
            "rating": u.get("rating", 1200),
            "avatar": u.get("avatar", "🦁"),
            "title": u.get("title", "Challenger"),
            "totalMatches": total,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "winRate": win_rate,
            "form": form
        })
    conn.close()
    
    leaderboard.sort(key=lambda x: (x["rating"], x["winRate"], x["wins"], x["totalMatches"]), reverse=True)
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
    return leaderboard

# Auto-initialize database schema on import
init_db()

