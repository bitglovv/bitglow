import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { sanitizeText } from "../services/security";
import { createPostSchema, feedQuerySchema, idParamSchema, postCommentSchema, updatePostSchema } from "./schemas";

export async function postRoutes(fastify: FastifyInstance) {
    fastify.post("/posts", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: createPostSchema,
    }, async (req, reply) => {
        console.log("AUTH:", req.auth);
        console.log("HEADERS:", req.headers.authorization);

        if (!req.auth) {
            return reply.code(401).send({ message: "Not authenticated" });
        }

        const userId = req.auth.id;

        const { content, title, visibility } = (req.body || {}) as { content?: string; title?: string; visibility?: string };

        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return reply.code(400).send({ message: "Content is required" });
        }

        const vis = visibility === "public" ? "public" : "friends";
        const post = await db.createPost(userId, sanitizeText(content.trim(), 5000), title?.trim() ? sanitizeText(title.trim(), 140) : undefined, vis);
        const author = await db.getUserById(userId);

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

    fastify.get("/posts/feed", { preHandler: fastify.requireAuth, schema: feedQuerySchema }, async (req, reply) => {
        const userId = req.auth!.id;

        const { limit = "50", offset = "0" } = (req.query || {}) as { limit?: string; offset?: string };
        const l = Math.min(Number(limit) || 50, 100);
        const o = Number(offset) || 0;

        const posts = await db.getFeedPosts(userId, l, o);
        return { posts };
    });

    fastify.post("/posts/:id/like", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const result = await db.toggleLike(userId, id);
        return { liked: result.liked, likesCount: result.count };
    });

    fastify.post("/posts/:id/save", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const result = await db.toggleSave(userId, id);
        return { saved: result.saved, savesCount: result.count };
    });

    fastify.post("/posts/:id/comment", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: postCommentSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const { content } = (req.body || {}) as { content?: string };
        if (!content || !content.trim()) {
            return reply.code(400).send({ message: "Comment content required" });
        }
        const comment = await db.addComment(userId, id, sanitizeText(content.trim(), 1000));
        const author = await db.getUserById(userId);
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

    fastify.get("/posts/:id/comments", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const comments = await db.getComments(id);
        return { comments };
    });

    fastify.put("/posts/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: updatePostSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const { content, title } = (req.body || {}) as { content?: string; title?: string };
        if (!content || !content.trim()) return reply.code(400).send({ message: "Content required" });
        const updated = await db.updatePost(id, userId, sanitizeText(content.trim(), 5000), title?.trim() ? sanitizeText(title.trim(), 140) : undefined);
        if (!updated) return reply.code(404).send({ message: "Post not found" });
        return { post: updated };
    });

    fastify.delete("/posts/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const ok = await db.deletePost(id, userId);
        if (!ok) return reply.code(404).send({ message: "Post not found" });
        return { ok: true };
    });
}
