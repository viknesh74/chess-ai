// frontend/src/utils/dbApi.ts
// Client utility to communicate with the FastAPI SQLite Database

import { UserProfile, GameRecord } from '../types/chess';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api/db';

/**
 * Register a new user in SQLite DB
 */
export async function dbRegisterUser(profile: {
  name: string;
  username: string;
  rating?: number;
  avatar?: string;
  title?: string;
}): Promise<UserProfile | null> {
  const localProfile: UserProfile = {
    name: profile.name,
    username: profile.username.trim().toLowerCase(),
    rating: profile.rating || 1200,
    avatar: profile.avatar || '🦁',
    title: profile.title || 'Challenger',
    registeredAt: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem('vicky_chess_all_players_v1');
    const existing: UserProfile[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter(p => p.username.toLowerCase() !== localProfile.username.toLowerCase());
    localStorage.setItem('vicky_chess_all_players_v1', JSON.stringify([localProfile, ...filtered]));
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      const data = await res.json();
      return data.user as UserProfile;
    }
  } catch (err) {
    console.warn('Backend DB offline, operating locally:', err);
  }
  return localProfile;
}

/**
 * Sign In / Authenticate username against SQLite DB or local storage
 */
export async function dbLoginUser(username: string): Promise<UserProfile | null> {
  const normUser = username.trim().toLowerCase();
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normUser }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.user as UserProfile;
    }
  } catch {
    // Backend offline, fallback to local
  }

  // Fallback to local profiles
  try {
    const raw = localStorage.getItem('vicky_chess_all_players_v1');
    if (raw) {
      const existing: UserProfile[] = JSON.parse(raw);
      const found = existing.find(p => p.username.toLowerCase() === normUser || p.name.toLowerCase() === normUser);
      if (found) return found;
    }
    const curRaw = localStorage.getItem('vicky_current_user');
    if (curRaw) {
      const cur: UserProfile = JSON.parse(curRaw);
      if (cur && (cur.username.toLowerCase() === normUser || cur.name.toLowerCase() === normUser)) {
        return cur;
      }
    }
    if (normUser === 'ned04') {
      return {
        name: 'Ned04',
        username: 'ned04',
        rating: 1500,
        avatar: '🦁',
        title: 'Challenger',
        registeredAt: new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Fetch all registered users from SQLite DB
 */
export async function dbGetAllUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.users || []) as UserProfile[];
  } catch (err) {
    console.warn('Backend DB offline:', err);
    return [];
  }
}

/**
 * Save completed match to SQLite DB
 */
export async function dbSaveMatch(game: GameRecord): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not save match to DB:', err);
    return false;
  }
}

/**
 * Fetch all recent matches across all players
 */
export async function dbGetAllMatches(): Promise<GameRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/matches`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches || []) as GameRecord[];
  } catch (err) {
    console.warn('Could not fetch all matches from DB:', err);
    return [];
  }
}

/**
 * Fetch user's match history from SQLite DB
 */
export async function dbGetUserMatches(username: string): Promise<GameRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/matches/${encodeURIComponent(username.trim().toLowerCase())}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches || []) as GameRecord[];
  } catch (err) {
    console.warn('Could not fetch matches from DB:', err);
    return [];
  }
}

/**
 * Delete a match record from SQLite DB
 */
export async function dbDeleteMatch(matchId: string | number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/matches/${matchId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not delete match from DB:', err);
    return false;
  }
}

/**
 * Clear all matches for a user from SQLite DB
 */
export async function dbClearUserMatches(username: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/matches/user/${encodeURIComponent(username.trim().toLowerCase())}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not clear user matches from DB:', err);
    return false;
  }
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  name: string;
  rating: number;
  avatar: string;
  title: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  form: string[];
  createdAt?: number;
}

const DEFAULT_CHAMPIONS: LeaderboardEntry[] = [
  {
    rank: 1,
    username: 'ned04',
    name: 'Ned04',
    rating: 1500,
    avatar: '🦁',
    title: 'Challenger',
    totalMatches: 3,
    wins: 1,
    losses: 2,
    draws: 0,
    winRate: 33.3,
    form: ['L', 'L', 'W'],
    createdAt: 1793785550,
  },
];

/**
 * Computes live reactive leaderboard from local storage records & champions
 */
export function computeLocalLeaderboard(): LeaderboardEntry[] {
  const playerMap = new Map<string, LeaderboardEntry>();

  // 1. Seed baseline champion(s)
  for (const champ of DEFAULT_CHAMPIONS) {
    playerMap.set(champ.username.toLowerCase(), { ...champ, form: [...champ.form] });
  }

  // 2. Load registered players
  try {
    const rawPlayers = localStorage.getItem('vicky_chess_all_players_v1');
    if (rawPlayers) {
      const players: UserProfile[] = JSON.parse(rawPlayers);
      if (Array.isArray(players)) {
        for (const p of players) {
          if (!p || !p.username) continue;
          const uKey = p.username.toLowerCase();
          if (!playerMap.has(uKey)) {
            playerMap.set(uKey, {
              rank: 0,
              username: p.username,
              name: p.name || p.username,
              rating: p.rating || 1200,
              avatar: p.avatar || '♟️',
              title: p.title || 'Challenger',
              totalMatches: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              winRate: 0,
              form: [],
              createdAt: Date.now() / 1000,
            });
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Load active user if present
  try {
    const rawCur = localStorage.getItem('vicky_current_user');
    if (rawCur) {
      const cur: UserProfile = JSON.parse(rawCur);
      if (cur && cur.username) {
        const uKey = cur.username.toLowerCase();
        if (!playerMap.has(uKey)) {
          playerMap.set(uKey, {
            rank: 0,
            username: cur.username,
            name: cur.name || cur.username,
            rating: cur.rating || 1200,
            avatar: cur.avatar || '🦁',
            title: cur.title || 'Challenger',
            totalMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            form: [],
            createdAt: Date.now() / 1000,
          });
        }
      }
    }
  } catch {
    // ignore
  }

  // 4. Ingest match history and update stats dynamically
  try {
    const rawMatches = localStorage.getItem('vicky_live_match_history');
    if (rawMatches) {
      const matches: GameRecord[] = JSON.parse(rawMatches);
      if (Array.isArray(matches)) {
        // Process chronologically (reverse if saved newest-first)
        const chrono = [...matches].reverse();
        for (const m of chrono) {
          const playerName = m.userName || (m.userColor === 'white' ? m.white : m.black);
          if (!playerName) continue;

          // Find or create player entry
          let targetKey = playerName.toLowerCase().trim();
          let entry = playerMap.get(targetKey);
          if (!entry) {
            for (const [k, e] of playerMap.entries()) {
              if (e.name.toLowerCase().trim() === targetKey || k === targetKey) {
                entry = e;
                targetKey = k;
                break;
              }
            }
          }

          if (!entry) {
            entry = {
              rank: 0,
              username: targetKey.replace(/\s+/g, '_'),
              name: playerName,
              rating: 1200,
              avatar: '🦁',
              title: 'Challenger',
              totalMatches: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              winRate: 0,
              form: [],
              createdAt: Date.now() / 1000,
            };
            playerMap.set(targetKey, entry);
          }

          // Accumulate match
          entry.totalMatches += 1;
          const out = m.outcome;
          if (out === 'win') {
            entry.wins += 1;
            entry.rating += 16;
            entry.form.push('W');
          } else if (out === 'loss') {
            entry.losses += 1;
            entry.rating = Math.max(800, entry.rating - 16);
            entry.form.push('L');
          } else {
            entry.draws += 1;
            entry.form.push('D');
          }

          if (entry.form.length > 5) {
            entry.form = entry.form.slice(-5);
          }

          entry.winRate = Number(((entry.wins / entry.totalMatches) * 100).toFixed(1));
        }
      }
    }
  } catch {
    // ignore
  }

  // 5. Sort by Elo rating descending, then wins, then winRate
  const sorted = Array.from(playerMap.values()).sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  // Assign ranks
  sorted.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  return sorted;
}

/**
 * Fetch live Leaderboard from MongoDB / SQLite DB or reactive client storage
 */
export async function dbGetLeaderboard(): Promise<{
  database: string;
  totalPlayers: number;
  leaderboard: LeaderboardEntry[];
}> {
  // Try remote backend if reachable with fast 600ms timeout
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalHost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalHost || !API_BASE.startsWith('http://127.0.0.1')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600);

      const res = await fetch(`${API_BASE}/leaderboard`, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard && data.leaderboard.length > 0) {
          return {
            database: data.database || 'mongodb',
            totalPlayers: data.totalPlayers || data.leaderboard.length,
            leaderboard: data.leaderboard as LeaderboardEntry[],
          };
        }
      }
    }
  } catch {
    // Fall back to client storage
  }

  // Seamless client reactive fallback
  const localList = computeLocalLeaderboard();
  return {
    database: 'local-store',
    totalPlayers: localList.length,
    leaderboard: localList,
  };
}


