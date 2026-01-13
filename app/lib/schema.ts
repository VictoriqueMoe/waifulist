import { Database } from "better-sqlite3";

export function updateSchema(db: Database) {
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
}
