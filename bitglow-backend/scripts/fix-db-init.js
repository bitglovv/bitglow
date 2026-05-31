const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'src', 'services', 'db.ts');
let src = fs.readFileSync(dbPath, 'utf8').replace(/\r\n/g, '\n');

// ─── FIX 1: initPostsTable ────────────────────────────────────────────────
// Replace entire initPostsTable body so:
//   a) users column ALTERs are in DO $$ safety blocks
//   b) posts CREATE TABLE runs BEFORE any ALTER TABLE posts
const oldInitPosts = `// Ensure posts + related tables exist for blogging
const initPostsTable = async () => {
    try {
        await pool.query(\`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\`);
        await pool.query(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;\`);
        await pool.query(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS online_status_visible BOOLEAN DEFAULT true;\`);
        await pool.query(\`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='updated_at') THEN
                    ALTER TABLE posts ADD COLUMN updated_at TIMESTAMP DEFAULT now();
                END IF;
            END $$;
        \`);
        await pool.query(\`
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT,
                content TEXT NOT NULL,
                visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public','friends')),
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

            CREATE TABLE IF NOT EXISTS post_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

            CREATE TABLE IF NOT EXISTS post_saves (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id);

            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

            CREATE TABLE IF NOT EXISTS post_comment_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, comment_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment ON post_comment_likes(comment_id);
        \`);
    } catch (err) {
        console.error("Failed to ensure posts table", err);
    }
};
void initPostsTable();`;

const newInitPosts = `// Ensure posts + related tables exist for blogging
const initPostsTable = async () => {
    try {
        // 1. Safely add optional columns to users (table already exists from initCoreTables)
        await pool.query(\`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_private') THEN
                    ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='online_status_visible') THEN
                    ALTER TABLE users ADD COLUMN online_status_visible BOOLEAN DEFAULT true;
                END IF;
            END $$;
        \`);

        // 2. Create posts + related tables FIRST
        await pool.query(\`
            CREATE TABLE IF NOT EXISTS posts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title TEXT,
                content TEXT NOT NULL,
                visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public','friends')),
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

            CREATE TABLE IF NOT EXISTS post_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);

            CREATE TABLE IF NOT EXISTS post_saves (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, post_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_saves_post ON post_saves(post_id);

            CREATE TABLE IF NOT EXISTS post_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

            CREATE TABLE IF NOT EXISTS post_comment_likes (
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT now(),
                PRIMARY KEY (user_id, comment_id)
            );
            CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment ON post_comment_likes(comment_id);
        \`);

        // 3. Safe migration: add updated_at only if missing (for existing DBs)
        await pool.query(\`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='updated_at') THEN
                    ALTER TABLE posts ADD COLUMN updated_at TIMESTAMP DEFAULT now();
                END IF;
            END $$;
        \`);
    } catch (err) {
        console.error("Failed to ensure posts table", err);
    }
};`;

// ─── FIX 2: initSecurityTables ───────────────────────────────────────────
// Replace bare ALTER TABLE user_sessions with safe DO $$ block
const oldInitSecurity = `            ALTER TABLE user_sessions
            ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;`;

const newInitSecurity = `            -- Safe migration: add columns only if they don't exist
            -- (ADD COLUMN IF NOT EXISTS not supported inside DO $$ in older PG)
            ALTER TABLE user_sessions
            ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;`;

// ─── FIX 3: initDMTables ─────────────────────────────────────────────────
// Replace the dm_messages CREATE TABLE to include all columns from the start
// so the DO $$ migration blocks are only for existing DBs
const oldDmCreate = `            CREATE TABLE IF NOT EXISTS dm_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                type TEXT DEFAULT 'text' CHECK (type IN ('text', 'post')),
                post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT now()
            );`;

const newDmCreate = `            CREATE TABLE IF NOT EXISTS dm_messages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                type TEXT DEFAULT 'text' CHECK (type IN ('text', 'post', 'profile')),
                post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
                profile_id UUID REFERENCES users(id) ON DELETE SET NULL,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT now()
            );`;

// ─── FIX 4: Replace all void initX() calls with sequential initDB() ──────
const oldVoidCalls = `void initCoreTables();`;
const newVoidCalls = `// Sequential startup — each step awaits the previous to avoid race conditions
void (async () => {
    try {
        console.log('[DB] Initializing tables sequentially...');
        await initCoreTables();
        await initPostsTable();
        await initSecurityTables();
        await initDMTables();
        await initLiveTables();
        await initLegacyMessagesTable();
        console.log('[DB] All tables initialized successfully.');
    } catch (err) {
        console.error('[DB] Fatal error during table initialization:', err);
    }
})();`;

// Remove the other standalone void calls (they are now handled by the IIFE)
const voidsToRemove = [
    '\nvoid initPostsTable();',
    '\nvoid initSecurityTables();',
    '\nvoid initDMTables();',
    '\nvoid initLiveTables();',
    '\nvoid initLegacyMessagesTable();',
];

// Apply changes
if (!src.includes(oldInitPosts)) {
    console.error('ERROR: Could not find oldInitPosts pattern. Aborting.');
    process.exit(1);
}
src = src.replace(oldInitPosts, newInitPosts);

// Security tables ALTER (just comment addition, benign)
src = src.replace(oldInitSecurity, newInitSecurity);

// DM messages with full columns
if (!src.includes(oldDmCreate)) {
    console.error('ERROR: Could not find oldDmCreate pattern. Aborting.');
    process.exit(1);
}
src = src.replace(oldDmCreate, newDmCreate);

// Sequential init
if (!src.includes(oldVoidCalls)) {
    console.error('ERROR: Could not find void initCoreTables() call. Aborting.');
    process.exit(1);
}
src = src.replace(oldVoidCalls, newVoidCalls);

// Remove other void calls
for (const v of voidsToRemove) {
    src = src.replace(v, '');
}

// Convert back to CRLF if necessary, or just write LF (Windows / Node handles LF perfectly anyway, and git handles it)
fs.writeFileSync(dbPath, src, 'utf8');
console.log('db.ts patched successfully.');
