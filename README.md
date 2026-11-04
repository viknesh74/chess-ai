# chess-ai

**Vicky AI Chess** — A personalized chess engine and full-stack web application trained on real Chess.com games using an XGBoost style-matching classifier coupled with tactical Minimax search.

---

## 🌟 Highlights & Features
- **Personalized Master AI (Vicky AI)**: Hybrid decision-making combining XGBoost style probability with Minimax tactical pruning (~2200 Elo strength).
- **Master Opening Repertoire**: Embedded signature repertoire including the French Defense (`1. e4 e6`), King's Pawn lines, and custom systems.
- **Dual-Engine Database Architecture**:
  - Primary: **MongoDB** (`vicky_chess_db`) for users, game records, and active boards.
  - Fallback: Local **SQLite** (`vicky_chess.db`) with zero setup needed.
- **Global Leaderboard**: Real-time ranking calculated from database matches with Elo ratings, win rates, W-L-D records, and form streaks.
- **Interactive Game Replay**: Click any saved match to step through moves, use auto-play replay with board sound effects, and inspect notation score sheets.
- **Isolated User Sessions**: Custom profile registration and login by username — each player has their own clocks, active board, and match history.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Chess.js
- **Backend**: FastAPI, Python 3.12+, Uvicorn, Pydantic
- **Machine Learning**: XGBoost, Scikit-learn, Pandas, NumPy, python-chess
- **Database**: MongoDB (PyMongo) + SQLite3

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install fastapi uvicorn xgboost scikit-learn pandas numpy python-chess pymongo python-dotenv
python backend/run_server.py
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

### 3. Database Configuration (Optional)
Copy `.env.example` to `.env`:
```env
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=vicky_chess_db
```
*(If MongoDB is not installed, the app automatically runs on local SQLite!)*

---

## 📊 ML Architecture & Accuracy
- **Training Data**: 192 high-accuracy peak tournament games (37,848 sampled board positions).
- **Features Extracted**: 23 chess features (center control, destination square defense, capture drives, queen pressure, rank advances, piece-square balance).
- **Validation AUC**: 0.7642
- **Top-3 Move Prediction Accuracy**: 48.73%
- **Model Recall**: 82.84%
