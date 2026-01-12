import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import type { UserSettings } from "@/types/settings";
import type { WatchStatus } from "@/types/anime";
import { isBuildPhase } from "@/lib/utils/runtimeUtils";

const SALT_ROUNDS = 12;

export class DatabaseError extends Error {
    public constructor(
        message: string,
        public readonly operation: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = "DatabaseError";
    }
}

const dataDir = path.join(process.cwd(), "data");
if (!isBuildPhase && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "waifulist.db");
const db = isBuildPhase ? ({} as Database.Database) : new Database(dbPath);

if (!isBuildPhase) {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            public_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS watched_anime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            anime_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            episodes_watched INTEGER DEFAULT 0,
            rating INTEGER DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            date_added TEXT NOT NULL DEFAULT (datetime('now')),
            date_updated TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, anime_id)
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            settings TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_watched_user ON watched_anime(user_id);
        CREATE INDEX IF NOT EXISTS idx_watched_status ON watched_anime(user_id, status);

        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bookmarked_user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (bookmarked_user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, bookmarked_user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

        CREATE TABLE IF NOT EXISTS tier_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            public_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL DEFAULT 'My Tier List',
            data TEXT NOT NULL DEFAULT '{"S":[],"A":[],"B":[],"C":[],"D":[],"F":[]}',
            comments_enabled INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tier_lists_user ON tier_lists(user_id);
        CREATE INDEX IF NOT EXISTS idx_tier_lists_public_id ON tier_lists(public_id);

        CREATE TABLE IF NOT EXISTS anonymous_tier_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            public_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL DEFAULT 'My Tier List',
            data TEXT NOT NULL DEFAULT '{"S":[],"A":[],"B":[],"C":[],"D":[],"F":[]}',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_anonymous_tier_lists_public_id ON anonymous_tier_lists(public_id);

        CREATE TABLE IF NOT EXISTS tier_list_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tier_list_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (tier_list_id) REFERENCES tier_lists(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_comments_tier_list ON tier_list_comments(tier_list_id, created_at);

        CREATE TABLE IF NOT EXISTS comment_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            emoji TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (comment_id) REFERENCES tier_list_comments(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(comment_id, user_id, emoji)
        );

        CREATE INDEX IF NOT EXISTS idx_reactions_comment ON comment_reactions(comment_id);

        CREATE TABLE IF NOT EXISTS airing_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mal_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, mal_id)
        );

        CREATE INDEX IF NOT EXISTS idx_airing_subs_user ON airing_subscriptions(user_id);
    `);

    function addColumnIfNotExists(table: string, column: string, definition: string): void {
        const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const columnExists = tableInfo.some(col => col.name === column);
        if (!columnExists) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
    }

    addColumnIfNotExists("watched_anime", "rating", "INTEGER DEFAULT NULL");
    addColumnIfNotExists("watched_anime", "notes", "TEXT DEFAULT NULL");
    addColumnIfNotExists("users", "public_id", "TEXT");
    addColumnIfNotExists("tier_lists", "is_public", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfNotExists("tier_lists", "comments_enabled", "INTEGER NOT NULL DEFAULT 1");

    db.exec("CREATE INDEX IF NOT EXISTS idx_tier_lists_public ON tier_lists(is_public, updated_at)");

    const backfillPublicIds = db.transaction(() => {
        const usersWithoutPublicId = db.prepare("SELECT id FROM users WHERE public_id IS NULL").all() as {
            id: number;
        }[];
        if (usersWithoutPublicId.length > 0) {
            const updateStmt = db.prepare("UPDATE users SET public_id = ? WHERE id = ?");
            for (const user of usersWithoutPublicId) {
                updateStmt.run(crypto.randomUUID(), user.id);
            }
        }
    });
    backfillPublicIds();

    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id)");
}

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
    public_id: string;
    created_at: string;
}

export async function createUser(username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const publicId = crypto.randomUUID();

    const createUserTransaction = db.transaction(() => {
        const stmt = db.prepare("INSERT INTO users (username, password_hash, public_id) VALUES (?, ?, ?)");
        const result = stmt.run(username, passwordHash, publicId);
        const user = getUserById(result.lastInsertRowid as number);
        if (!user) {
            throw new DatabaseError("User created but could not be retrieved", "createUser");
        }
        return user;
    });

    try {
        return createUserTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            throw new DatabaseError(`Username '${username}' already exists`, "createUser", error);
        }
        throw new DatabaseError("Failed to create user", "createUser", error);
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

export function getUserByPublicId(publicId: string): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE public_id = ?");
    return stmt.get(publicId) as User | null;
}

export function updateUsername(userId: number, newUsername: string): User {
    const updateTransaction = db.transaction(() => {
        const stmt = db.prepare("UPDATE users SET username = ? WHERE id = ?");
        const result = stmt.run(newUsername, userId);

        if (result.changes === 0) {
            throw new DatabaseError(`User with id ${userId} not found`, "updateUsername");
        }

        const user = getUserById(userId);
        if (!user) {
            throw new DatabaseError("User updated but could not be retrieved", "updateUsername");
        }
        return user;
    });

    try {
        return updateTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            throw new DatabaseError(`Username '${newUsername}' is already taken`, "updateUsername", error);
        }
        throw new DatabaseError("Failed to update username", "updateUsername", error);
    }
}

export async function updatePassword(userId: number, newPassword: string): Promise<User> {
    const passwordHash = await hashPassword(newPassword);

    const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    const result = stmt.run(passwordHash, userId);

    if (result.changes === 0) {
        throw new DatabaseError(`User with id ${userId} not found`, "updatePassword");
    }

    const user = getUserById(userId);
    if (!user) {
        throw new DatabaseError("User updated but could not be retrieved", "updatePassword");
    }
    return user;
}

export interface WatchedAnimeRow {
    id: number;
    user_id: number;
    anime_id: number;
    status: WatchStatus;
    episodes_watched: number;
    rating: number | null;
    notes: string | null;
    date_added: string;
    date_updated: string;
}

export function addToWatchList(userId: number, animeId: number, status: string): WatchedAnimeRow {
    const addToListTransaction = db.transaction(() => {
        const stmt = db.prepare(`
            INSERT INTO watched_anime (user_id, anime_id, status)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, anime_id) DO UPDATE SET
                status = excluded.status,
                date_updated = datetime('now')
        `);
        stmt.run(userId, animeId, status);
        const row = getWatchedAnime(userId, animeId);
        if (!row) {
            throw new DatabaseError("Failed to add/update watch list entry", "addToWatchList");
        }
        return row;
    });

    try {
        return addToListTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        throw new DatabaseError("Failed to add to watch list", "addToWatchList", error);
    }
}

export function restoreWatchList(userId: number, rows: WatchedAnimeRow[]): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status, episodes_watched, rating, notes, date_added, date_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO UPDATE SET
        status = excluded.status,
        episodes_watched = excluded.episodes_watched,
        rating = excluded.rating,
        notes = excluded.notes,
        date_added = excluded.date_added,
        date_updated = excluded.date_updated
    `);

    const restoreMany = db.transaction((watched: WatchedAnimeRow[]) => {
        let count = 0;
        for (const w of watched) {
            const result = stmt.run(
                userId,
                w.anime_id,
                w.status,
                w.episodes_watched,
                w.rating,
                w.notes ?? null,
                w.date_added,
                w.date_updated,
            );
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    try {
        return restoreMany(rows);
    } catch (error) {
        throw new DatabaseError(`Failed to restore ${rows.length} anime to watch list`, "restoreWatchList", error);
    }
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

    try {
        return insertMany(animeIds);
    } catch (error) {
        throw new DatabaseError(
            `Failed to bulk add ${animeIds.length} anime to watch list`,
            "bulkAddToWatchList",
            error,
        );
    }
}

export type BulkImportEntry = {
    animeId: number;
    status: WatchStatus;
    episodesWatched: number;
    rating: number | null;
    notes: string | null;
};

export function bulkImportToWatchList(userId: number, entries: BulkImportEntry[]): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status, episodes_watched, rating, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO UPDATE SET
            status = excluded.status,
            episodes_watched = excluded.episodes_watched,
            rating = excluded.rating,
            notes = excluded.notes,
            date_updated = datetime('now')
    `);

    const importMany = db.transaction((items: BulkImportEntry[]) => {
        let count = 0;
        for (const entry of items) {
            const result = stmt.run(
                userId,
                entry.animeId,
                entry.status,
                entry.episodesWatched,
                entry.rating,
                entry.notes,
            );
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    try {
        return importMany(entries);
    } catch (error) {
        throw new DatabaseError(
            `Failed to bulk import ${entries.length} anime to watch list`,
            "bulkImportToWatchList",
            error,
        );
    }
}

export function updateWatchStatus(
    userId: number,
    animeId: number,
    updates: { status?: string; episodes_watched?: number; rating?: number | null; notes?: string | null },
): WatchedAnimeRow {
    const updateTransaction = db.transaction(() => {
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
        if (updates.notes !== undefined) {
            fields.push("notes = ?");
            values.push(updates.notes);
        }

        values.push(userId, animeId);

        const stmt = db.prepare(`UPDATE watched_anime SET ${fields.join(", ")} WHERE user_id = ? AND anime_id = ?`);
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new DatabaseError(
                `No watch list entry found for user ${userId} and anime ${animeId}`,
                "updateWatchStatus",
            );
        }

        const row = getWatchedAnime(userId, animeId);
        if (!row) {
            throw new DatabaseError("Updated entry could not be retrieved", "updateWatchStatus");
        }
        return row;
    });

    try {
        return updateTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        throw new DatabaseError("Failed to update watch status", "updateWatchStatus", error);
    }
}

export function removeFromWatchList(userId: number, animeId: number): boolean {
    try {
        const stmt = db.prepare("DELETE FROM watched_anime WHERE user_id = ? AND anime_id = ?");
        const result = stmt.run(userId, animeId);
        return result.changes > 0;
    } catch (error) {
        throw new DatabaseError("Failed to remove from watch list", "removeFromWatchList", error);
    }
}

export function getWatchedAnime(userId: number, animeId: number): WatchedAnimeRow | null {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? AND anime_id = ?");
    return stmt.get(userId, animeId) as WatchedAnimeRow | null;
}

export function getAllWatched(userId: number): WatchedAnimeRow[] {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? ORDER BY date_updated DESC");
    return stmt.all(userId) as WatchedAnimeRow[];
}

export function getWatchedByStatus(userId: number, status: WatchStatus): WatchedAnimeRow[] {
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

    for (const row of rows) {
        counts[row.status] = row.count;
    }

    return counts;
}

export function getTopRatedAnime(userId: number, limit: number = 5): WatchedAnimeRow[] {
    const stmt = db.prepare(
        "SELECT * FROM watched_anime WHERE user_id = ? AND rating IS NOT NULL ORDER BY rating DESC, date_added DESC LIMIT ?",
    );
    return stmt.all(userId, limit) as WatchedAnimeRow[];
}

export function getRecentAnime(userId: number, limit: number = 5, excludeIds: number[] = []): WatchedAnimeRow[] {
    if (excludeIds.length === 0) {
        const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? ORDER BY date_added DESC LIMIT ?");
        return stmt.all(userId, limit) as WatchedAnimeRow[];
    }
    const placeholders = excludeIds.map(() => "?").join(",");
    const stmt = db.prepare(
        `SELECT * FROM watched_anime WHERE user_id = ? AND anime_id NOT IN (${placeholders}) ORDER BY date_added DESC LIMIT ?`,
    );
    return stmt.all(userId, ...excludeIds, limit) as WatchedAnimeRow[];
}

export function getWatchedAnimeForUsers(userIds: number[], animeId: number): WatchedAnimeRow[] {
    if (userIds.length === 0) {
        return [];
    }
    const placeholders = userIds.map(() => "?").join(",");
    const stmt = db.prepare(`SELECT * FROM watched_anime WHERE user_id IN (${placeholders}) AND anime_id = ?`);
    return stmt.all(...userIds, animeId) as WatchedAnimeRow[];
}

const DEFAULT_SETTINGS: UserSettings = {};

export function getUserSettings(userId: number): UserSettings {
    const stmt = db.prepare("SELECT settings FROM user_settings WHERE user_id = ?");
    const row = stmt.get(userId) as { settings: string } | undefined;

    if (!row) {
        return DEFAULT_SETTINGS;
    }

    try {
        return JSON.parse(row.settings) as UserSettings;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function updateUserSettings(userId: number, updates: Partial<UserSettings>): UserSettings {
    const updateTransaction = db.transaction(() => {
        const current = getUserSettings(userId);
        const merged: UserSettings = {
            ...current,
            ...updates,
            browse: updates.browse ? { ...current.browse, ...updates.browse } : current.browse,
            myList: updates.myList ? { ...current.myList, ...updates.myList } : current.myList,
        };

        const settingsJson = JSON.stringify(merged);

        const stmt = db.prepare(`
            INSERT INTO user_settings (user_id, settings, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                settings = excluded.settings,
                updated_at = datetime('now')
        `);
        stmt.run(userId, settingsJson);

        return merged;
    });

    try {
        return updateTransaction();
    } catch (error) {
        throw new DatabaseError("Failed to update user settings", "updateUserSettings", error);
    }
}

export interface BookmarkedUser {
    id: number;
    username: string;
    public_id: string;
    created_at: string;
    bookmarked_at: string;
    watching_count: number;
    completed_count: number;
    last_activity: string | null;
}

export interface BookmarkRow {
    id: number;
    user_id: number;
    bookmarked_user_id: number;
    created_at: string;
}

export function addBookmark(userId: number, bookmarkedUserId: number): boolean {
    if (userId === bookmarkedUserId) {
        return false;
    }

    try {
        const stmt = db.prepare("INSERT INTO bookmarks (user_id, bookmarked_user_id) VALUES (?, ?)");
        const result = stmt.run(userId, bookmarkedUserId);
        return result.changes > 0;
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return false;
        }
        throw new DatabaseError("Failed to add bookmark", "addBookmark", error);
    }
}

export function removeBookmark(userId: number, bookmarkedUserId: number): boolean {
    try {
        const stmt = db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND bookmarked_user_id = ?");
        const result = stmt.run(userId, bookmarkedUserId);
        return result.changes > 0;
    } catch (error) {
        throw new DatabaseError("Failed to remove bookmark", "removeBookmark", error);
    }
}

export function hasBookmark(userId: number, bookmarkedUserId: number): boolean {
    const stmt = db.prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND bookmarked_user_id = ?");
    return stmt.get(userId, bookmarkedUserId) !== undefined;
}

export function getBookmarkedUsers(userId: number): BookmarkedUser[] {
    const stmt = db.prepare(`
        SELECT
            u.id,
            u.username,
            u.public_id,
            u.created_at,
            b.created_at as bookmarked_at,
            (SELECT COUNT(*) FROM watched_anime WHERE user_id = u.id AND status = 'watching') as watching_count,
            (SELECT COUNT(*) FROM watched_anime WHERE user_id = u.id AND status = 'completed') as completed_count,
            (SELECT MAX(date_updated) FROM watched_anime WHERE user_id = u.id) as last_activity
        FROM bookmarks b
        JOIN users u ON b.bookmarked_user_id = u.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `);
    return stmt.all(userId) as BookmarkedUser[];
}

export function getAllBookmarks(userId: number): BookmarkRow[] {
    const stmt = db.prepare(`SELECT * FROM bookmarks WHERE user_id = ?`);
    return stmt.all(userId) as BookmarkRow[];
}

export function restoreBookmarks(userId: number, rows: BookmarkRow[]) {
    const stmt = db.prepare(`
        INSERT INTO bookmarks (user_id, bookmarked_user_id, created_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id, bookmarked_user_id) DO UPDATE SET
        created_at = excluded.created_at
    `);
    const restoreMany = db.transaction((bookmarks: BookmarkRow[]) => {
        let count = 0;
        for (const b of bookmarks) {
            const result = stmt.run(userId, b.bookmarked_user_id, b.created_at);
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });
    try {
        return restoreMany(rows);
    } catch (error) {
        throw new DatabaseError("Failed to restore bookmarks", "restoreBookmarks", error);
    }
}

export interface TierListRow {
    id: number;
    user_id: number;
    public_id: string;
    name: string;
    data: string;
    is_public: number;
    comments_enabled: number;
    created_at: string;
    updated_at: string;
}

export interface TierListWithUsername extends TierListRow {
    username: string;
}

export function createTierList(userId: number, name: string = "My Tier List"): TierListRow {
    const publicId = crypto.randomUUID();
    const stmt = db.prepare(`
        INSERT INTO tier_lists (user_id, public_id, name)
        VALUES (?, ?, ?)
    `);
    const result = stmt.run(userId, publicId, name);
    const tierList = getTierListById(result.lastInsertRowid as number);
    if (!tierList) {
        throw new DatabaseError("Tier list created but could not be retrieved", "createTierList");
    }
    return tierList;
}

export function getTierListById(id: number): TierListRow | null {
    const stmt = db.prepare("SELECT * FROM tier_lists WHERE id = ?");
    return stmt.get(id) as TierListRow | null;
}

export function getTierListByPublicId(publicId: string): TierListWithUsername | null {
    const stmt = db.prepare(`
        SELECT t.*, u.username
        FROM tier_lists t
        JOIN users u ON t.user_id = u.id
        WHERE t.public_id = ?
    `);
    return stmt.get(publicId) as TierListWithUsername | null;
}

export function getTierListsByUserId(userId: number): TierListRow[] {
    const stmt = db.prepare("SELECT * FROM tier_lists WHERE user_id = ? ORDER BY updated_at DESC");
    return stmt.all(userId) as TierListRow[];
}

export function updateTierList(
    id: number,
    userId: number,
    updates: { name?: string; data?: string; is_public?: number; comments_enabled?: number },
): TierListRow {
    const fields: string[] = ["updated_at = datetime('now')"];
    const values: (string | number)[] = [];

    if (updates.name !== undefined) {
        fields.push("name = ?");
        values.push(updates.name);
    }
    if (updates.data !== undefined) {
        fields.push("data = ?");
        values.push(updates.data);
    }
    if (updates.is_public !== undefined) {
        fields.push("is_public = ?");
        values.push(updates.is_public);
    }
    if (updates.comments_enabled !== undefined) {
        fields.push("comments_enabled = ?");
        values.push(updates.comments_enabled);
    }

    values.push(id, userId);

    const stmt = db.prepare(`UPDATE tier_lists SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
        throw new DatabaseError("Tier list not found or not owned by user", "updateTierList");
    }

    const tierList = getTierListById(id);
    if (!tierList) {
        throw new DatabaseError("Tier list updated but could not be retrieved", "updateTierList");
    }
    return tierList;
}

export function deleteTierList(id: number, userId: number): boolean {
    const stmt = db.prepare("DELETE FROM tier_lists WHERE id = ? AND user_id = ?");
    const result = stmt.run(id, userId);
    return result.changes > 0;
}

export function restoreTierLists(userId: number, rows: TierListRow[]) {
    const stmt = db.prepare(`
        INSERT INTO tier_lists (user_id, public_id, name, data, comments_enabled, created_at, updated_at, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(public_id) DO UPDATE SET
        name = excluded.name,
        data = excluded.data,
        comments_enabled = excluded.comments_enabled,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        is_public = excluded.is_public    
    `);
    const restoreMany = db.transaction((tiers: TierListRow[]) => {
        let count = 0;
        for (const t of tiers) {
            const result = stmt.run(
                userId,
                t.public_id,
                t.name,
                t.data,
                t.comments_enabled,
                t.created_at,
                t.updated_at,
                t.is_public,
            );
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });
    try {
        return restoreMany(rows);
    } catch (error) {
        throw new DatabaseError("Failed to restore tier lists", "restoreTierLists", error);
    }
}

export type PublicTierListSort = "newest" | "oldest" | "name";

export interface PublicTierListsResult {
    rows: TierListWithUsername[];
    total: number;
}

export function getPublicTierLists(options: {
    limit: number;
    offset: number;
    search?: string;
    sort?: PublicTierListSort;
}): PublicTierListsResult {
    const { limit, offset, search, sort = "newest" } = options;

    let orderBy = "t.updated_at DESC";
    if (sort === "oldest") {
        orderBy = "t.updated_at ASC";
    } else if (sort === "name") {
        orderBy = "t.name ASC";
    }

    const baseQuery = `
        FROM tier_lists t
        JOIN users u ON t.user_id = u.id
        WHERE t.is_public = 1
        ${search ? "AND (t.name LIKE '%' || ? || '%' OR u.username LIKE '%' || ? || '%')" : ""}
    `;

    const countStmt = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`);
    const countParams = search ? [search, search] : [];
    const countResult = countStmt.get(...countParams) as { count: number };

    const dataStmt = db.prepare(`
        SELECT t.*, u.username
        ${baseQuery}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
    `);
    const dataParams = search ? [search, search, limit, offset] : [limit, offset];
    const rows = dataStmt.all(...dataParams) as TierListWithUsername[];

    return { rows, total: countResult.count };
}

export interface AnonymousTierListRow {
    id: number;
    public_id: string;
    name: string;
    data: string;
    created_at: string;
}

export function createAnonymousTierList(name: string, data: string): AnonymousTierListRow {
    const publicId = crypto.randomUUID();
    const stmt = db.prepare(`
        INSERT INTO anonymous_tier_lists (public_id, name, data)
        VALUES (?, ?, ?)
    `);
    const result = stmt.run(publicId, name, data);
    const tierList = getAnonymousTierListById(result.lastInsertRowid as number);
    if (!tierList) {
        throw new DatabaseError("Anonymous tier list created but could not be retrieved", "createAnonymousTierList");
    }
    return tierList;
}

export function getAnonymousTierListById(id: number): AnonymousTierListRow | null {
    const stmt = db.prepare("SELECT * FROM anonymous_tier_lists WHERE id = ?");
    return stmt.get(id) as AnonymousTierListRow | null;
}

export function getAnonymousTierListByPublicId(publicId: string): AnonymousTierListRow | null {
    const stmt = db.prepare("SELECT * FROM anonymous_tier_lists WHERE public_id = ?");
    return stmt.get(publicId) as AnonymousTierListRow | null;
}

export interface TierListCommentRow {
    id: number;
    tier_list_id: number;
    user_id: number;
    username: string;
    content: string;
    created_at: string;
}

export function getCommentsByTierListId(tierListId: number): TierListCommentRow[] {
    const stmt = db.prepare(`
        SELECT c.*, u.username
        FROM tier_list_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.tier_list_id = ?
        ORDER BY c.created_at DESC
    `);
    return stmt.all(tierListId) as TierListCommentRow[];
}

export function createComment(tierListId: number, userId: number, content: string): TierListCommentRow {
    const stmt = db.prepare(`
        INSERT INTO tier_list_comments (tier_list_id, user_id, content)
        VALUES (?, ?, ?)
    `);
    const result = stmt.run(tierListId, userId, content);

    const commentStmt = db.prepare(`
        SELECT c.*, u.username
        FROM tier_list_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    `);
    const comment = commentStmt.get(result.lastInsertRowid) as TierListCommentRow | null;
    if (!comment) {
        throw new DatabaseError("Comment created but could not be retrieved", "createComment");
    }
    return comment;
}

export function deleteComment(commentId: number, userId: number, tierListOwnerId: number): boolean {
    const stmt = db.prepare(`
        DELETE FROM tier_list_comments
        WHERE id = ? AND (user_id = ? OR ? = (SELECT user_id FROM tier_lists WHERE id = tier_list_id))
    `);
    const result = stmt.run(commentId, userId, tierListOwnerId);
    return result.changes > 0;
}

export function getCommentById(commentId: number): TierListCommentRow | null {
    const stmt = db.prepare(`
        SELECT c.*, u.username
        FROM tier_list_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    `);
    return stmt.get(commentId) as TierListCommentRow | null;
}

export interface CommentReactionRow {
    id: number;
    comment_id: number;
    user_id: number;
    emoji: string;
    created_at: string;
}

export interface ReactionCount {
    emoji: string;
    count: number;
    userReacted: boolean;
    users: string[];
}

export function getReactionsForComments(commentIds: number[], userId: number | null): Map<number, ReactionCount[]> {
    if (commentIds.length === 0) {
        return new Map();
    }

    const placeholders = commentIds.map(() => "?").join(",");
    const stmt = db.prepare(`
        SELECT comment_id, emoji, COUNT(*) as count
        FROM comment_reactions
        WHERE comment_id IN (${placeholders})
        GROUP BY comment_id, emoji
    `);
    const counts = stmt.all(...commentIds) as { comment_id: number; emoji: string; count: number }[];

    const usersStmt = db.prepare(`
        SELECT cr.comment_id, cr.emoji, u.username
        FROM comment_reactions cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.comment_id IN (${placeholders})
        ORDER BY cr.created_at ASC
    `);
    const userRows = usersStmt.all(...commentIds) as { comment_id: number; emoji: string; username: string }[];

    const usersMap = new Map<string, string[]>();
    for (const row of userRows) {
        const key = `${row.comment_id}:${row.emoji}`;
        const users = usersMap.get(key) || [];
        if (users.length < 10) {
            users.push(row.username);
        }
        usersMap.set(key, users);
    }

    let userReactions: Set<string> = new Set();
    if (userId) {
        const userStmt = db.prepare(`
            SELECT comment_id, emoji
            FROM comment_reactions
            WHERE comment_id IN (${placeholders}) AND user_id = ?
        `);
        const myRows = userStmt.all(...commentIds, userId) as { comment_id: number; emoji: string }[];
        userReactions = new Set(myRows.map(r => `${r.comment_id}:${r.emoji}`));
    }

    const result = new Map<number, ReactionCount[]>();
    for (const commentId of commentIds) {
        result.set(commentId, []);
    }

    for (const row of counts) {
        const key = `${row.comment_id}:${row.emoji}`;
        const reactions = result.get(row.comment_id) || [];
        reactions.push({
            emoji: row.emoji,
            count: row.count,
            userReacted: userReactions.has(key),
            users: usersMap.get(key) || [],
        });
        result.set(row.comment_id, reactions);
    }

    return result;
}

export function toggleReaction(commentId: number, userId: number, emoji: string): boolean {
    const existing = db
        .prepare(
            `
        SELECT id FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?
    `,
        )
        .get(commentId, userId, emoji);

    if (existing) {
        db.prepare(`DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?`).run(
            commentId,
            userId,
            emoji,
        );
        return false;
    } else {
        db.prepare(`INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES (?, ?, ?)`).run(
            commentId,
            userId,
            emoji,
        );
        return true;
    }
}

export interface AiringSubscriptionRow {
    id: number;
    user_id: number;
    mal_id: number;
    title: string;
    created_at: string;
}

export function addAiringSubscription(userId: number, malId: number, title: string): boolean {
    try {
        db.prepare(`INSERT INTO airing_subscriptions (user_id, mal_id, title) VALUES (?, ?, ?)`).run(
            userId,
            malId,
            title,
        );
        return true;
    } catch {
        return false;
    }
}

export function removeAiringSubscription(userId: number, malId: number): boolean {
    const result = db.prepare(`DELETE FROM airing_subscriptions WHERE user_id = ? AND mal_id = ?`).run(userId, malId);
    return result.changes > 0;
}

export function getAiringSubscriptions(userId: number): AiringSubscriptionRow[] {
    return db
        .prepare(`SELECT * FROM airing_subscriptions WHERE user_id = ? ORDER BY created_at DESC`)
        .all(userId) as AiringSubscriptionRow[];
}

export function hasAiringSubscription(userId: number, malId: number): boolean {
    const row = db.prepare(`SELECT 1 FROM airing_subscriptions WHERE user_id = ? AND mal_id = ?`).get(userId, malId);
    return !!row;
}

export function getUniqueSubscribedMalIds(): number[] {
    const rows = db.prepare(`SELECT DISTINCT mal_id FROM airing_subscriptions`).all() as { mal_id: number }[];
    return rows.map(r => r.mal_id);
}

export function deleteSubscriptionsByMalIds(malIds: number[]): number {
    if (malIds.length === 0) {
        return 0;
    }
    const placeholders = malIds.map(() => "?").join(",");
    const result = db.prepare(`DELETE FROM airing_subscriptions WHERE mal_id IN (${placeholders})`).run(...malIds);
    return result.changes;
}

export default db;
