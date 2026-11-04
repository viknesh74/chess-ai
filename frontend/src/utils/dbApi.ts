// frontend/src/utils/dbApi.ts
// Client utility to communicate with the FastAPI SQLite Database

import { UserProfile, GameRecord } from '../types/chess';

const API_HOST = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.DEV ? 'http://127.0.0.1:8000' : '';
const API_BASE = `${API_HOST}/api/db`;

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
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as UserProfile;
  } catch (err) {
    console.warn('Backend DB offline, operating locally:', err);
    return null;
  }
}

/**
 * Sign In / Authenticate username against SQLite DB
 */
export async function dbLoginUser(username: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim().toLowerCase() }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as UserProfile;
  } catch (err) {
    console.warn('Backend DB offline, falling back to local storage:', err);
    return null;
  }
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

/**
 * Fetch live Leaderboard from MongoDB / SQLite DB
 */
export async function dbGetLeaderboard(): Promise<{
  database: string;
  totalPlayers: number;
  leaderboard: LeaderboardEntry[];
}> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (!res.ok) {
      return { database: 'offline', totalPlayers: 0, leaderboard: [] };
    }
    const data = await res.json();
    return {
      database: data.database || 'mongodb',
      totalPlayers: data.totalPlayers || 0,
      leaderboard: (data.leaderboard || []) as LeaderboardEntry[],
    };
  } catch (err) {
    console.warn('Could not fetch leaderboard from DB:', err);
    return { database: 'offline', totalPlayers: 0, leaderboard: [] };
  }
}


