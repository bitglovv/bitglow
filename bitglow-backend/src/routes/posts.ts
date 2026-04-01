import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/store";
import { db } from "../services/db";

export async function postRoutes(fastify: FastifyInstance) {
    const getAuthUserId = (req: any, reply: any): string | null => {
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
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return decoded.id;
        } catch {
            reply.code(401).send({ message: "Invalid token" });
            return null;
        }
    };

    fastify.post("/posts", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const { content, title, visibility } = (req.body || {}) as { content?: string; title?: string; visibility?: string };

        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return reply.code(400).send({ message: "Content is required" });
        }

        const vis = visibility === "public" ? "public" : "friends";
        const post = await db.createPost(userId, content.trim(), title?.trim() || undefined, vis);
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

    fastify.get("/posts/feed", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;

        const { limit = "50", offset = "0" } = (req.query || {}) as { limit?: string; offset?: string };
        const l = Math.min(Number(limit) || 50, 100);
        const o = Number(offset) || 0;

        const posts = await db.getFeedPosts(userId, l, o);
        return { posts };
    });

    fastify.post("/posts/:id/like", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const result = await db.toggleLike(userId, id);
        return { liked: result.liked, likesCount: result.count };
    });

    fastify.post("/posts/:id/save", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const result = await db.toggleSave(userId, id);
        return { saved: result.saved, savesCount: result.count };
    });

    fastify.post("/posts/:id/comment", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const { content } = (req.body || {}) as { content?: string };
        if (!content || !content.trim()) {
            return reply.code(400).send({ message: "Comment content required" });
        }
        const comment = await db.addComment(userId, id, content.trim());
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

    fastify.get("/posts/:id/comments", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const comments = await db.getComments(id);
        return { comments };
    });

    fastify.put("/posts/:id", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const { content, title } = (req.body || {}) as { content?: string; title?: string };
        if (!content || !content.trim()) return reply.code(400).send({ message: "Content required" });
        const updated = await db.updatePost(id, userId, content.trim(), title?.trim());
        if (!updated) return reply.code(404).send({ message: "Post not found" });
        return { post: updated };
    });

    fastify.delete("/posts/:id", async (req, reply) => {
        const userId = getAuthUserId(req, reply);
        if (!userId) return;
        const { id } = req.params as { id: string };
        const ok = await db.deletePost(id, userId);
        if (!ok) return reply.code(404).send({ message: "Post not found" });
        return { ok: true };
    });
}
