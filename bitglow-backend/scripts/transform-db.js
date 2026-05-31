const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'src', 'services', 'db.ts');
let content = fs.readFileSync(dbPath, 'utf8');

// The interfaces are already injected (if I ran it, wait I haven't run it yet? No, I only wrote the script).
// Let's rewrite the script to do proper types.

const interfaces = `
export interface LiveRoomRow {
    id: string;
    owner_id: string;
    owner_username: string;
    owner_display_name?: string;
    owner_avatar_url?: string;
    created_at: string | Date;
    last_message_at: string | Date;
    is_canonical?: boolean;
}

export interface LiveMessageRow {
    id: string;
    room_id: string;
    sender_id: string;
    username: string;
    content: string;
    created_at: string | Date;
}

export interface FriendRow {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
}

export interface PostRow {
    id: string;
    content: string;
    title?: string;
    visibility?: string;
    created_at: string | Date;
    author_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    likesCount?: number;
    commentsCount?: number;
    savesCount?: number;
    likedByMe?: boolean | number;
    savedByMe?: boolean | number;
}

export interface CommentRow {
    id: string;
    content: string;
    created_at: string | Date;
    author_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    likesCount?: number;
    likedByMe?: boolean | number;
}

export interface NotificationRow {
    id: string;
    type: string;
    created_at: string | Date;
    is_read: boolean;
    actor_id: string;
    actor_username: string;
    actor_display_name?: string;
    actor_avatar_url?: string;
    post_id?: string;
}

export interface DMMessageRow {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    type: string;
    created_at: string | Date;
    post_id?: string;
}

export interface SecurityLogRow {
    id: string;
    event_type: string;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    details?: any;
    created_at: string | Date;
    ts?: string | Date;
}
`;

if (!content.includes('export interface LiveRoomRow')) {
    content = content.replace(/(import .*?;[\r\n]+)(const pool = new Pool)/s, "$1" + interfaces + "\n$2");
}

content = content.replace(/return res.rows.reverse\(\).map\(row => \(\{/g, "return res.rows.reverse().map((row: SecurityLogRow) => ({");
content = content.replace(/return res.rows.map\(\(row\) => mapLiveRoom\(row, userId\)\);/g, "return res.rows.map((row: LiveRoomRow) => mapLiveRoom(row, userId));");
content = content.replace(/friends.map\(\(friend: any\) => friend.id\)/g, "friends.map((friend: FriendRow) => friend.id)");
content = content.replace(/return res.rows.map\(row => \(\{\n\s*id: row.id,\n\s*roomId: row.room_id,/g, "return res.rows.map((row: LiveMessageRow) => ({\n            id: row.id,\n            roomId: row.room_id,");
content = content.replace(/return res.rows.map\(row => \(\{\n\s*id: row.id,\n\s*content: row.content,/g, "return res.rows.map((row: PostRow) => ({\n            id: row.id,\n            content: row.content,");
content = content.replace(/return res.rows.map\(r => \(\{\n\s*id: r.id,\n\s*content: r.content,/g, "return res.rows.map((r: CommentRow) => ({\n            id: r.id,\n            content: r.content,");
content = content.replace(/\.\.\.likesRes.rows.map\(\(r: any\) => \(\{/g, "...likesRes.rows.map((r: NotificationRow) => ({");
content = content.replace(/\.\.\.commentsRes.rows.map\(\(r: any\) => \(\{/g, "...commentsRes.rows.map((r: NotificationRow) => ({");
content = content.replace(/\.\.\.commentLikesRes.rows.map\(\(r: any\) => \(\{/g, "...commentLikesRes.rows.map((r: NotificationRow) => ({");
content = content.replace(/\.\.\.followsRes.rows.map\(\(r: any\) => \(\{/g, "...followsRes.rows.map((r: NotificationRow) => ({");
content = content.replace(/\.\.\.dmsRes.rows.map\(\(r: any\) => \(\{/g, "...dmsRes.rows.map((r: NotificationRow) => ({");

content = content.replace(/return res.rows.map\(row => \(\{\n\s*id: row.id,\n\s*conversationId: row.conversation_id,/g, "return res.rows.map((row: DMMessageRow) => ({\n            id: row.id,\n            conversationId: row.conversation_id,");

// Also replace any remaining `row =>` or `(row) =>` with explicit typing.
// Since we don't know the exact ones left, let's catch the ones for Notification, Friends, etc.
content = content.replace(/return res.rows.map\(row => \(\{\n\s*id: row.id,\n\s*username: row.username,\n\s*displayName: row.display_name,\n\s*avatarUrl: row.avatar_url/g, "return res.rows.map((row: FriendRow) => ({\n            id: row.id,\n            username: row.username,\n            displayName: row.display_name,\n            avatarUrl: row.avatar_url");

content = content.replace(/return res.rows.map\(row => \(\{\n\s*id: row.id,\n\s*type: row.type,\n\s*createdAt: row.created_at,/g, "return res.rows.map((row: NotificationRow) => ({\n            id: row.id,\n            type: row.type,\n            createdAt: row.created_at,");

fs.writeFileSync(dbPath, content, 'utf8');
console.log('Transformed db.ts');
