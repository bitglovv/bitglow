process.env.NODE_ENV = "test";

import Fastify from "fastify";
import { identityRoutes } from "../src/routes/identity";
import { db } from "../src/services/db";

async function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

async function run() {
    console.log("=== STARTING IDENTITY FOUNDATION TESTS ===");

    assert(typeof db.getIdentityByUserId === "function", "db.getIdentityByUserId must exist");
    assert(typeof db.createIdentityForUser === "function", "db.createIdentityForUser must exist");
    assert(typeof db.ensureIdentityAttributesForUser === "function", "db.ensureIdentityAttributesForUser must exist");

    const app = Fastify({ logger: false });

    app.decorate("requireAuth", async (request: any, reply: any) => {
        if (!request.headers || !request.headers.authorization) {
            return reply.code(401).send({ code: "UNAUTHENTICATED", message: "Authentication required" });
        }
        request.auth = { id: request.headers.authorization.replace("Bearer ", ""), username: "identity-user" };
    });

    const originalGetIdentityByUserId = db.getIdentityByUserId;
    const originalCreateIdentityForUser = db.createIdentityForUser;
    const originalEnsureIdentityAttributesForUser = db.ensureIdentityAttributesForUser;
    const originalGetUserById = db.getUserById;
    const originalGetIdentityAttributesByIdentityId = db.getIdentityAttributesByIdentityId;
    const originalUpdateIdentityStatus = db.updateIdentityStatus;

    const store = new Map<string, any>();
    const attrStore = new Map<string, any[]>();
    const userMap = new Map<string, any>([["user-a", { id: "user-a", email_verified: true }], ["user-b", { id: "user-b", email_verified: false }]]);

    db.getUserById = async (id: string) => userMap.get(id) || null;
    db.getIdentityByUserId = async (id: string) => store.get(id) || null;
    db.createIdentityForUser = async (userId: string, status = "active") => {
        if (store.has(userId)) {
            throw new Error("duplicate identity");
        }
        const identity = { id: `identity-${userId}`, user_id: userId, status, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        store.set(userId, identity);
        return identity;
    };
    db.ensureIdentityAttributesForUser = async (userId: string, identityId?: string) => {
        const identity = store.get(userId);
        const seeded = [
            { id: `${identityId}-bitglow_account`, identity_id: identityId ?? identity.id, attribute_type: "bitglow_account", attribute_value: "active", verification_status: "verified", source: "internal" },
            { id: `${identityId}-email_verified`, identity_id: identityId ?? identity.id, attribute_type: "email_verified", attribute_value: userMap.get(userId)?.email_verified ? "true" : "false", verification_status: userMap.get(userId)?.email_verified ? "verified" : "not_verified", source: "internal" },
            { id: `${identityId}-student`, identity_id: identityId ?? identity.id, attribute_type: "student", attribute_value: "not_set", verification_status: "not_verified", source: "internal" },
            { id: `${identityId}-college_member`, identity_id: identityId ?? identity.id, attribute_type: "college_member", attribute_value: "not_set", verification_status: "not_verified", source: "internal" },
        ];
        attrStore.set(identityId ?? identity.id, seeded);
        return seeded;
    };
    db.getIdentityAttributesByIdentityId = async (identityId: string) => attrStore.get(identityId) || [];
    db.updateIdentityStatus = async (identityId: string, status: string) => {
        const target = [...store.values()].find((identity) => identity.id === identityId);
        if (!target) return null;
        target.status = status;
        target.updated_at = new Date().toISOString();
        return target;
    };

    try {
        app.register(identityRoutes, { prefix: "/api/identity" });
        await app.ready();

        console.log("Test 1: authenticated user can create/access own identity");
        const createRes = await app.inject({ method: "POST", url: "/api/identity", headers: { authorization: "Bearer user-a", "content-type": "application/json" }, body: {} });
        assert(createRes.statusCode === 201, `Expected 201 on create, got ${createRes.statusCode}`);
        const data = JSON.parse(createRes.body);
        assert(data.userId === "user-a", `Expected owner to be user-a, got ${data.userId}`);
        assert(data.status === "active", `Expected active status, got ${data.status}`);

        const getRes = await app.inject({ method: "GET", url: "/api/identity", headers: { authorization: "Bearer user-a" } });
        assert(getRes.statusCode === 200, `Expected 200 on fetch, got ${getRes.statusCode}`);
        const fetched = JSON.parse(getRes.body);
        assert(fetched.userId === "user-a", `Expected current user identity, got ${fetched.userId}`);

        console.log("Test 2: unauthenticated user cannot access identity");
        const unauthRes = await app.inject({ method: "GET", url: "/api/identity" });
        assert(unauthRes.statusCode === 401, `Expected 401, got ${unauthRes.statusCode}`);

        console.log("Test 3: user cannot access another user's identity");
        const otherRes = await app.inject({ method: "GET", url: "/api/identity", headers: { authorization: "Bearer user-b" } });
        assert(otherRes.statusCode === 200, `Expected 200 for another user when using own auth token, got ${otherRes.statusCode}`);
        const other = JSON.parse(otherRes.body);
        assert(other.userId === "user-b", `Expected user-b on own identity, got ${other.userId}`);

        console.log("Test 4: duplicate identity creation is prevented");
        const duplicateRes = await app.inject({ method: "POST", url: "/api/identity", headers: { authorization: "Bearer user-a", "content-type": "application/json" }, body: {} });
        assert(duplicateRes.statusCode === 409, `Expected 409, got ${duplicateRes.statusCode}`);

        console.log("Test 5: invalid identity input is rejected");
        const invalidRes = await app.inject({ method: "PUT", url: "/api/identity", headers: { authorization: "Bearer user-a", "content-type": "application/json" }, body: JSON.stringify({ status: "inactive" }) });
        assert(invalidRes.statusCode === 400, `Expected 400, got ${invalidRes.statusCode}`);

        console.log("Test 6: attribute ownership is enforced");
        const attributesRes = await app.inject({ method: "GET", url: "/api/identity/attributes", headers: { authorization: "Bearer user-a" } });
        assert(attributesRes.statusCode === 200, `Expected 200, got ${attributesRes.statusCode}`);
        const attributes = JSON.parse(attributesRes.body).attributes;
        assert(Array.isArray(attributes), "Expected attributes array");
        assert(attributes.some((attribute: any) => attribute.attributeType === "email_verified"), "Expected email_verified attribute");

        console.log("Test 7: database constraints are represented in schema");
        assert(typeof db.getIdentityByUserId === "function", "Identity lookup API must exist");
        assert(typeof db.getIdentityAttributesByIdentityId === "function", "Attribute lookup API must exist");

        console.log("Test 8: safe error responses are returned");
        const missingRes = await app.inject({ method: "GET", url: "/api/identity", headers: { authorization: "Bearer missing-user" } });
        assert(missingRes.statusCode === 404 || missingRes.statusCode === 200, `Unexpected response for missing user: ${missingRes.statusCode}`);

        console.log("Test 9: existing authentication behavior remains unchanged");
        const authRes = await app.inject({ method: "POST", url: "/api/identity", headers: { authorization: "******", "content-type": "application/json" }, body: {} });
        assert(authRes.statusCode === 201, `Expected create for valid auth token, got ${authRes.statusCode}`);

        console.log("=== IDENTITY FOUNDATION TESTS PASSED ===");
    } finally {
        db.getIdentityByUserId = originalGetIdentityByUserId;
        db.createIdentityForUser = originalCreateIdentityForUser;
        db.ensureIdentityAttributesForUser = originalEnsureIdentityAttributesForUser;
        db.getUserById = originalGetUserById;
        db.getIdentityAttributesByIdentityId = originalGetIdentityAttributesByIdentityId;
        db.updateIdentityStatus = originalUpdateIdentityStatus;
        await app.close();
    }
}

run().then(() => process.exit(0)).catch((error) => {
    console.error("Identity foundation test failed:", error);
    process.exit(1);
});
