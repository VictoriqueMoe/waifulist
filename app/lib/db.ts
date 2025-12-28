import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

const dbPath = path.join(process.cwd(), "data", "waifulist.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watched_anime (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        episodes_watched INTEGER DEFAULT 0,
        rating INTEGER DEFAULT NULL,
        date_added TEXT NOT NULL DEFAULT (datetime('now')),
        date_updated TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, anime_id)
    );

    CREATE INDEX IF NOT EXISTS idx_watched_user ON watched_anime(user_id);
    CREATE INDEX IF NOT EXISTS idx_watched_status ON watched_anime(user_id, status);
`);

try {
    db.exec("ALTER TABLE watched_anime ADD COLUMN rating INTEGER DEFAULT NULL");
} catch {}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at: string;
}

export async function createUser(username: string, password: string): Promise<User | null> {
    const passwordHash = await hashPassword(password);
    try {
        const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        const result = stmt.run(username, passwordHash);
        return getUserById(result.lastInsertRowid as number);
    } catch {
        return null;
    }
}

export function getUserById(id: number): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id) as User | null;
}

export function getUserByUsername(username: string): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username) as User | null;
}

export interface WatchedAnimeRow {
    id: number;
    user_id: number;
    anime_id: number;
    status: string;
    episodes_watched: number;
    rating: number | null;
    date_added: string;
    date_updated: string;
}

export function addToWatchList(userId: number, animeId: number, status: string): WatchedAnimeRow | null {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO UPDATE SET
            status = excluded.status,
            date_updated = datetime('now')
    `);
    stmt.run(userId, animeId, status);
    return getWatchedAnime(userId, animeId);
}

export function bulkAddToWatchList(userId: number, animeIds: number[], status: string): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO NOTHING
    `);

    const insertMany = db.transaction((ids: number[]) => {
        let count = 0;
        for (const animeId of ids) {
            const result = stmt.run(userId, animeId, status);
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    return insertMany(animeIds);
}

export function updateWatchStatus(
    userId: number,
    animeId: number,
    updates: { status?: string; episodes_watched?: number; rating?: number | null },
): WatchedAnimeRow | null {
    const fields: string[] = ["date_updated = datetime('now')"];
    const values: (string | number | null)[] = [];

    if (updates.status !== undefined) {
        fields.push("status = ?");
        values.push(updates.status);
    }
    if (updates.episodes_watched !== undefined) {
        fields.push("episodes_watched = ?");
        values.push(updates.episodes_watched);
    }
    if (updates.rating !== undefined) {
        fields.push("rating = ?");
        values.push(updates.rating);
    }

    values.push(userId, animeId);

    const stmt = db.prepare(`UPDATE watched_anime SET ${fields.join(", ")} WHERE user_id = ? AND anime_id = ?`);
    stmt.run(...values);
    return getWatchedAnime(userId, animeId);
}

export function removeFromWatchList(userId: number, animeId: number): boolean {
    const stmt = db.prepare("DELETE FROM watched_anime WHERE user_id = ? AND anime_id = ?");
    const result = stmt.run(userId, animeId);
    return result.changes > 0;
}

export function getWatchedAnime(userId: number, animeId: number): WatchedAnimeRow | null {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? AND anime_id = ?");
    return stmt.get(userId, animeId) as WatchedAnimeRow | null;
}

export function getAllWatched(userId: number): WatchedAnimeRow[] {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? ORDER BY date_updated DESC");
    return stmt.all(userId) as WatchedAnimeRow[];
}

export function getWatchedByStatus(userId: number, status: string): WatchedAnimeRow[] {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? AND status = ? ORDER BY date_updated DESC");
    return stmt.all(userId, status) as WatchedAnimeRow[];
}

export function getWatchedCount(userId: number): number {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM watched_anime WHERE user_id = ?");
    const result = stmt.get(userId) as { count: number };
    return result.count;
}

export function getWatchedCountByStatus(userId: number): Record<string, number> {
    const stmt = db.prepare("SELECT status, COUNT(*) as count FROM watched_anime WHERE user_id = ? GROUP BY status");
    const rows = stmt.all(userId) as { status: string; count: number }[];
    const counts: Record<string, number> = {};
    rows.forEach(row => {
        counts[row.status] = row.count;
    });
    return counts;
}

export default db;
