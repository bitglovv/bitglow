"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRoutes = postRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const store_1 = require("../services/store");
const db_1 = require("../services/db");
async function postRoutes(fastify) {
    const getAuthUserId = (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            reply.code(401).send({ message: "No token provided" });
            return null;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            reply.code(401).send({ message: "Malformed token" });
            return null;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, store_1.JWT_SECRET);
            return decoded.id;
        }
        catch {
            reply.code(401).send({ message: "Invalid token" });
            return null;
        }
    };
    fastify.post("/posts", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { content, title, visibility } = (req.body || {});
        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return reply.code(400).send({ message: "Content is required" });
        }
        const vis = visibility === "public" ? "public" : "friends";
        const post = await db_1.db.createPost(userId, content.trim(), title?.trim() || undefined, vis);
        const author = await db_1.db.getUserById(userId);
        return {
            post: {
                id: post.id,
                title: post.title,
                content: post.content,
                visibility: post.visibility,
                createdAt: post.created_at,
                author: {
                    id: author.id,
                    username: author.username,
                    displayName: author.display_name,
                    avatarUrl: author.avatar_url
                }
            }
        };
    });
    fastify.get("/posts/feed", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { limit = "50", offset = "0" } = (req.query || {});
        const l = Math.min(Number(limit) || 50, 100);
        const o = Number(offset) || 0;
        const posts = await db_1.db.getFeedPosts(userId, l, o);
        return { posts };
    });
    fastify.post("/posts/:id/like", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const result = await db_1.db.toggleLike(userId, id);
        return { liked: result.liked, likesCount: result.count };
    });
    fastify.post("/posts/:id/save", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const result = await db_1.db.toggleSave(userId, id);
        return { saved: result.saved, savesCount: result.count };
    });
    fastify.post("/posts/:id/comment", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const { content } = (req.body || {});
        if (!content || !content.trim()) {
            return reply.code(400).send({ message: "Comment content required" });
        }
        const comment = await db_1.db.addComment(userId, id, content.trim());
        const author = await db_1.db.getUserById(userId);
        return {
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.created_at,
                author: {
                    id: author.id,
                    username: author.username,
                    displayName: author.display_name,
                    avatarUrl: author.avatar_url,
                },
            },
        };
    });
    fastify.get("/posts/:id/comments", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const comments = await db_1.db.getComments(id);
        return { comments };
    });
    fastify.put("/posts/:id", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const { content, title } = (req.body || {});
        if (!content || !content.trim())
            return reply.code(400).send({ message: "Content required" });
        const updated = await db_1.db.updatePost(id, userId, content.trim(), title?.trim());
        if (!updated)
            return reply.code(404).send({ message: "Post not found" });
        return { post: updated };
    });
    fastify.delete("/posts/:id", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId)
            return;
        const { id } = req.params;
        const ok = await db_1.db.deletePost(id, userId);
        if (!ok)
            return reply.code(404).send({ message: "Post not found" });
        return { ok: true };
    });
}
