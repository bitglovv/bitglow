"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRoutes = postRoutes;
const db_1 = require("../services/db");
const security_1 = require("../services/security");
const schemas_1 = require("./schemas");
async function postRoutes(fastify) {
    fastify.post("/posts", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.createPostSchema,
    }, async (req, reply) => {
        console.log("AUTH:", req.auth);
        console.log("HEADERS:", req.headers.authorization);
        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }
        const userId = req.auth.id;
        const { content, title, visibility } = (req.body || {});
        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return reply.code(400).send({ message: "Content is required" });
        }
        const vis = visibility === "public" ? "public" : "friends";
        const post = await db_1.db.createPost(userId, (0, security_1.sanitizeText)(content.trim(), 5000), title?.trim() ? (0, security_1.sanitizeText)(title.trim(), 140) : undefined, vis);
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
    fastify.get("/posts/feed", { preHandler: fastify.requireAuth, schema: schemas_1.feedQuerySchema }, async (req, reply) => {
        const userId = req.auth.id;
        const { limit = "50", offset = "0" } = (req.query || {});
        const l = Math.min(Number(limit) || 50, 100);
        const o = Number(offset) || 0;
        const posts = await db_1.db.getFeedPosts(userId, l, o);
        return { posts };
    });
    fastify.post("/posts/:id/like", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        const result = await db_1.db.toggleLike(userId, id);
        return { liked: result.liked, likesCount: result.count };
    });
    fastify.post("/posts/:id/save", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        const result = await db_1.db.toggleSave(userId, id);
        return { saved: result.saved, savesCount: result.count };
    });
    fastify.post("/posts/:id/comment", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.postCommentSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        const { content } = (req.body || {});
        if (!content || !content.trim()) {
            return reply.code(400).send({ message: "Comment content required" });
        }
        const comment = await db_1.db.addComment(userId, id, (0, security_1.sanitizeText)(content.trim(), 1000));
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
    fastify.get("/posts/:id/comments", { preHandler: fastify.requireAuth, schema: schemas_1.idParamSchema }, async (req, reply) => {
        const { id } = req.params;
        const comments = await db_1.db.getComments(id);
        return { comments };
    });
    fastify.put("/posts/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.updatePostSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        const { content, title } = (req.body || {});
        if (!content || !content.trim())
            return reply.code(400).send({ message: "Content required" });
        const updated = await db_1.db.updatePost(id, userId, (0, security_1.sanitizeText)(content.trim(), 5000), title?.trim() ? (0, security_1.sanitizeText)(title.trim(), 140) : undefined);
        if (!updated)
            return reply.code(404).send({ message: "Post not found" });
        return { post: updated };
    });
    fastify.delete("/posts/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: schemas_1.idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth.id;
        const { id } = req.params;
        const ok = await db_1.db.deletePost(id, userId);
        if (!ok)
            return reply.code(404).send({ message: "Post not found" });
        return { ok: true };
    });
}
