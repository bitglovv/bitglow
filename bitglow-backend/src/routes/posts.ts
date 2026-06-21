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
        if (!result) return reply.code(404).send({ message: "Post not found" });
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
        if (!result) return reply.code(404).send({ message: "Post not found" });
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
        if (!comment) return reply.code(404).send({ message: "Post not found" });
        const author = await db.getUserById(userId);
        return {
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.created_at || comment.createdAt,
                likesCount: 0,
                likedByMe: false,
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
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const comments = await db.getComments(id, userId);
        if (!comments) return reply.code(404).send({ message: "Post not found" });
        return { comments };
    });

    fastify.post("/comments/:id/like", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
        schema: idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const result = await db.toggleCommentLike(userId, id);
        if (!result) return reply.code(404).send({ message: "Comment not found" });
        return { liked: result.liked, likesCount: result.likesCount };
    });

    fastify.delete("/comments/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: idParamSchema,
    }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const ok = await db.deleteComment(userId, id);
        if (!ok) return reply.code(403).send({ message: "Not authorized or comment not found" });
        return { ok: true };
    });

    fastify.put("/posts/:id", {
        preHandler: fastify.requireAuth,
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: updatePostSchema,
    }, async (req, reply) => {
        try {
            const userId = req.auth!.id;
            const { id } = req.params as { id: string };
            const { content, title } = (req.body || {}) as { content?: string; title?: string };

            if (!content || !content.trim()) {
                return reply.code(400).send({ error: "Validation Error", message: "Content required" });
            }

            // Fetch post first to check ownership and time
            const post = await db.getPostById(id, userId) as any;
            
            if (!post) {
                return reply.code(404).send({ error: "Not Found", message: "Post not found" });
            }

            // Defensive ownership check: support post.author.id OR post.author_id OR post.authorId
            const authorId = post.author?.id || post.author_id || post.authorId;
            
            if (!authorId || authorId !== userId) {
                return reply.code(403).send({ error: "Forbidden", message: "You can only edit your own posts" });
            }

            // Safe timestamp handling: support createdAt OR created_at
            const rawCreatedAt = post.createdAt || post.created_at;
            if (!rawCreatedAt) {
                console.error(`[UPDATE_POST] Post ${id} missing creation timestamp`);
                return reply.code(500).send({ error: "Database Error", message: "Post data is incomplete" });
            }

            const createdAt = new Date(rawCreatedAt).getTime();
            const now = Date.now();
            const fifteenMinutes = 15 * 60 * 1000;

            if (now - createdAt > fifteenMinutes) {
                return reply.code(400).send({ 
                    error: "Bad Request",
                    message: "Edit time limit exceeded. Posts can only be edited within 15 minutes of creation." 
                });
            }

            // Perform update
            const updated = await db.updatePost(
                id, 
                userId, 
                sanitizeText(content.trim(), 5000), 
                title?.trim() ? sanitizeText(title.trim(), 140) : undefined
            );
            
            if (!updated) {
                console.error(`[UPDATE_POST] Database update failed for post ${id}`);
                return reply.code(500).send({ error: "Database Error", message: "Failed to update post in database" });
            }

            return { post: updated };
        } catch (err: any) {
            console.error("[UPDATE_POST] UNHANDLED EXCEPTION:", err);
            return reply.code(500).send({ 
                error: "Internal Server Error", 
                message: err.message || "An unexpected error occurred" 
            });
        }
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

    fastify.get("/posts/:id", { preHandler: fastify.requireAuth, schema: idParamSchema }, async (req, reply) => {
        const userId = req.auth!.id;
        const { id } = req.params as { id: string };
        const post = await db.getPostById(id, userId);
        if (!post) {
            return reply.code(404).send({ message: "Post not found" });
        }
        return { post };
    });
}

