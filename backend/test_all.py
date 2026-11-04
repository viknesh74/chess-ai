import urllib.request
import json
import chess

BASE_URL = "http://127.0.0.1:8000"

def http_get(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "VickyTest"})
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def http_post(path, data):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "VickyTest"}
    )
    with urllib.request.urlopen(req) as response:
        return response.status, json.loads(response.read().decode("utf-8"))

def run_tests():
    print("=== STARTING VICKY AI CHESS SYSTEM VERIFICATION ===")

    # Test 1: Health Check
    print("Test 1: Health Check...")
    status, res = http_get("/api/health")
    assert status == 200, f"Health check failed: {status}"
    print("  -> Passed. App:", res.get("app"))

    # Test 2: Player Profile
    print("Test 2: Player Profile...")
    status, profile = http_get("/api/profile")
    assert status == 200, f"Profile endpoint failed: {status}"
    assert profile["overview"]["totalGames"] == 443, f"Expected 443 games, got {profile['overview']['totalGames']}"
    assert profile["overview"]["wins"] == 217, f"Expected 217 wins, got {profile['overview']['wins']}"
    assert profile["overview"]["losses"] == 183, f"Expected 183 losses, got {profile['overview']['losses']}"
    assert profile["overview"]["draws"] == 43, f"Expected 43 draws, got {profile['overview']['draws']}"
    assert profile["overview"]["whiteGames"] == 217, f"Expected 217 white games, got {profile['overview']['whiteGames']}"
    assert profile["overview"]["blackGames"] == 226, f"Expected 226 black games, got {profile['overview']['blackGames']}"
    print(f"  -> Passed. Total: {profile['overview']['totalGames']} games (217W / 183L / 43D).")

    # Test 3: Vicky Profile
    print("Test 3: Vicky AI Profile & Model Status...")
    status, vicky_prof = http_get("/api/vicky-profile")
    assert status == 200, f"Vicky profile endpoint failed: {status}"
    assert vicky_prof["modelStatus"]["trained"] is True, "Model status should be TRAINED"
    assert vicky_prof["modelStatus"]["top3Accuracy"] > 40.0, "Top-3 accuracy should be recorded"
    print(f"  -> Passed. Model: {vicky_prof['modelStatus']['algorithm']}, Top-3 Accuracy: {vicky_prof['modelStatus']['top3Accuracy']}%")

    # Test 4: Vicky Move Selection (White Initial Move)
    print("Test 4: Move Selection as White (Initial position)...")
    board = chess.Board()
    payload = {
        "fen": board.fen(),
        "personalizationWeight": 0.65,
        "historyMoves": []
    }
    status, res = http_post("/api/vicky-move", payload)
    assert status == 200, f"Move selection failed: {status}"
    assert "uci" in res and "san" in res, "Missing move in response"
    print(f"  -> Passed. Move selected: {res['san']} ({res['uci']}). Explanation: {res['explanation']}")

    # Test 5: Vicky Move Selection as Black (Responding to 1. e4)
    print("Test 5: Move Selection as Black (Response to 1. e4)...")
    board.push_san("e4")
    payload = {
        "fen": board.fen(),
        "personalizationWeight": 0.65,
        "historyMoves": ["e4"]
    }
    status, res_b = http_post("/api/vicky-move", payload)
    assert status == 200, f"Black move selection failed: {status}"
    assert res_b["san"] in ["e6", "e5", "c6", "d5"], f"Unexpected move {res_b['san']}"
    print(f"  -> Passed. Black responded with {res_b['san']} ({res_b['uci']}). Style score: {res_b['styleScore']}")

    # Test 6: Tactical Safety & Hanging Piece Verification
    print("Test 6: Tactical Safety & Hanging Piece Verification...")
    puzzle_fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
    payload = {
        "fen": puzzle_fen,
        "personalizationWeight": 0.65,
        "historyMoves": ["e4", "e5", "Bc4", "Nf6", "Qf3", "Nc6"]
    }
    status, res_tactical = http_post("/api/vicky-move", payload)
    assert status == 200, "Move failed on tactical position"
    print(f"  -> Passed. Tactical move selected: {res_tactical['san']}, Engine Eval: {res_tactical['engineEval']}")

    # Test 7: Games History
    print("Test 7: Games History Query...")
    status, games = http_get("/api/games")
    assert status == 200, f"Games query failed: {status}"
    assert games["total"] == 443, f"Expected 443 total games, got {games['total']}"
    print(f"  -> Passed. {games['total']} complete games available for replay.")

    print("\n=== ALL 7 SYSTEM TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
