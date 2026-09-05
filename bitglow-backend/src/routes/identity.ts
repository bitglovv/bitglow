import { FastifyInstance } from "fastify";
import { db } from "../services/db";
import { identityCreateSchema, identityUpdateSchema } from "./schemas";

export async function identityRoutes(fastify: FastifyInstance) {
    async function getOrCreateCurrentIdentity(userId: string) {
        let identity = await db.getIdentityByUserId(userId);
        if (!identity) {
            identity = await db.createIdentityForUser(userId, "active");
            await db.ensureIdentityAttributesForUser(userId, identity.id);
        }
        return identity;
    }

    async function serializeIdentity(identity: any, userId: string) {
        const identityAttributes = await db.getIdentityAttributesByIdentityId(identity.id);
        const user = await db.getUserById(userId);
        const normalizedAttributes = (identityAttributes || []).map((attribute: any) => ({
            id: attribute.id,
            attributeType: attribute.attribute_type,
            attributeValue: attribute.attribute_value,
            verificationStatus: attribute.verification_status,
            source: attribute.source,
            createdAt: attribute.created_at,
            updatedAt: attribute.updated_at,
        }));

        return {
            id: identity.id,
            userId: identity.user_id,
            status: identity.status,
            emailVerified: Boolean(user?.email_verified),
            createdAt: identity.created_at,
            updatedAt: identity.updated_at,
            attributes: normalizedAttributes,
        };
    }

    fastify.get("/", {
        preHandler: fastify.requireAuth,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }

        try {
            const identity = await getOrCreateCurrentIdentity(req.auth.id);
            return await serializeIdentity(identity, req.auth.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load identity";
            return reply.code(500).send({ code: "IDENTITY_ERROR", message });
        }
    });

    fastify.get("/me", {
        preHandler: fastify.requireAuth,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }

        try {
            const identity = await getOrCreateCurrentIdentity(req.auth.id);
            return await serializeIdentity(identity, req.auth.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load identity";
            return reply.code(500).send({ code: "IDENTITY_ERROR", message });
        }
    });

    fastify.post("/", {
        preHandler: fastify.requireAuth,
        schema: identityCreateSchema,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }

        const existingIdentity = await db.getIdentityByUserId(req.auth.id);
        if (existingIdentity) {
            return reply.code(409).send({ code: "IDENTITY_EXISTS", message: "Identity already exists for this user." });
        }

        try {
            const identity = await db.createIdentityForUser(req.auth.id, "active");
            await db.ensureIdentityAttributesForUser(req.auth.id, identity.id);
            return reply.code(201).send(await serializeIdentity(identity, req.auth.id));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create identity";
            return reply.code(500).send({ code: "IDENTITY_ERROR", message });
        }
    });

    fastify.put("/", {
        preHandler: fastify.requireAuth,
        schema: identityUpdateSchema,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }

        const { status } = req.body as { status?: string };
        const identity = await db.getIdentityByUserId(req.auth.id);
        if (!identity) {
            return reply.code(404).send({ code: "IDENTITY_NOT_FOUND", message: "Identity not found." });
        }

        const nextStatus = status || identity.status;
        if (nextStatus !== "active") {
            return reply.code(400).send({ code: "INVALID_IDENTITY_STATUS", message: "Only active status is supported in Phase 1." });
        }

        const updatedIdentity = await db.updateIdentityStatus(identity.id, nextStatus);
        if (!updatedIdentity) {
            return reply.code(500).send({ code: "IDENTITY_ERROR", message: "Failed to update identity." });
        }

        return await serializeIdentity(updatedIdentity, req.auth.id);
    });

    fastify.get("/attributes", {
        preHandler: fastify.requireAuth,
    }, async (req, reply) => {
        if (!req.auth) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }

        try {
            const identity = await getOrCreateCurrentIdentity(req.auth.id);
            const attributes = await db.getIdentityAttributesByIdentityId(identity.id);
            return {
                identityId: identity.id,
                attributes: (attributes || []).map((attribute: any) => ({
                    id: attribute.id,
                    attributeType: attribute.attribute_type,
                    attributeValue: attribute.attribute_value,
                    verificationStatus: attribute.verification_status,
                    source: attribute.source,
                    createdAt: attribute.created_at,
                    updatedAt: attribute.updated_at,
                })),
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load identity attributes";
            return reply.code(500).send({ code: "IDENTITY_ERROR", message });
        }
    });
}
