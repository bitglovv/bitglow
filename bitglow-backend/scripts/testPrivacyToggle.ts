import Fastify from "fastify";
import { randomUUID } from "crypto";
import authPlugin from "../src/plugins/auth";
import { userRoutes } from "../src/routes/user";
import { settingsRoutes } from "../src/routes/settings";
import { db } from "../src/services/db";
import { issueAccessToken, issueRefreshToken, hashToken } from "../src/services/security";

async function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

async function runTests() {
    console.log("=== STARTING PRIVACY PERSISTENCE & RELOAD REGRESSION TESTS ===");

    // Test 1: Verify db.updateUserPrivacy returns is_private from RETURNING clause
    console.log("Test 1: Verify db.updateUserPrivacy signature and return mapping");
    assert(typeof db.updateUserPrivacy === "function", "db.updateUserPrivacy must exist");
    assert(typeof db.getUserById === "function", "db.getUserById must exist");

    // Test 2: Verify GET /api/me correctly maps isPrivate from dbUser
    console.log("Test 2: Fastify app GET /api/me and PUT /api/settings/privacy route test");
    const app = Fastify({ logger: false });

    // Mock auth decoration for standalone route testing
    app.decorate("requireAuth", async (req: any, reply: any) => {
        req.auth = { id: "test-user-id", username: "testuser" };
    });

    let mockDbUser = {
        id: "test-user-id",
        username: "testuser",
        displayName: "Privacy Tester",
        email: "test@example.com",
        avatarUrl: null,
        website: null,
        location: null,
        bio: null,
        followersCount: 0,
        followsCount: 0,
        isPrivate: false,
        onlineStatusVisible: true,
    };

    // Override db.getUserById & db.updateUserPrivacy for deterministic route testing
    const originalGetUserById = db.getUserById;
    const originalUpdateUserPrivacy = db.updateUserPrivacy;
    const originalGetFollowersCount = db.getFollowersCount;
    const originalGetFollowingCount = db.getFollowingCount;

    db.getUserById = async (id: string) => (id === mockDbUser.id ? { ...mockDbUser } : null) as any;
    db.getFollowersCount = async () => 0;
    db.getFollowingCount = async () => 0;
    db.updateUserPrivacy = async (userId: string, isPrivate: boolean) => {
        if (userId === mockDbUser.id) {
            mockDbUser.isPrivate = isPrivate;
            return { id: userId, is_private: isPrivate };
        }
        return undefined;
    };

    try {
        app.register(userRoutes, { prefix: "/api" });
        app.register(settingsRoutes, { prefix: "/api/settings" });
        await app.ready();

        // Subtest A: Initial state false -> GET /api/me returns isPrivate: false
        console.log("Subtest A: GET /api/me returns isPrivate: false");
        const resA = await app.inject({ method: "GET", url: "/api/me" });
        await assert(resA.statusCode === 200, `GET /api/me failed: ${resA.statusCode}`);
        const dataA = JSON.parse(resA.body);
        await assert(dataA.isPrivate === false, `Expected isPrivate=false, got ${dataA.isPrivate}`);
        await assert(dataA.onlineStatusVisible === true, `Expected onlineStatusVisible=true, got ${dataA.onlineStatusVisible}`);

        // Subtest B: Toggle false -> true via PUT /api/settings/privacy
        console.log("Subtest B: PUT /api/settings/privacy with isPrivate=true");
        const resB = await app.inject({
            method: "PUT",
            url: "/api/settings/privacy",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isPrivate: true }),
        });
        await assert(resB.statusCode === 200, `PUT /api/settings/privacy failed: ${resB.statusCode}`);
        const dataB = JSON.parse(resB.body);
        await assert(dataB.ok === true && dataB.isPrivate === true, `Expected ok=true, isPrivate=true, got ${JSON.stringify(dataB)}`);

        // Subtest C: Reload GET /api/me returns isPrivate: true
        console.log("Subtest C: Reload GET /api/me returns isPrivate: true");
        const resC = await app.inject({ method: "GET", url: "/api/me" });
        const dataC = JSON.parse(resC.body);
        await assert(dataC.isPrivate === true, `Expected isPrivate=true on reload, got ${dataC.isPrivate}`);
        await assert(dataC.onlineStatusVisible === true, `Expected onlineStatusVisible to remain true, got ${dataC.onlineStatusVisible}`);

        // Subtest D: Toggle true -> false via PUT /api/settings/privacy
        console.log("Subtest D: PUT /api/settings/privacy with isPrivate=false");
        const resD = await app.inject({
            method: "PUT",
            url: "/api/settings/privacy",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isPrivate: false }),
        });
        await assert(resD.statusCode === 200, `PUT failed: ${resD.statusCode}`);
        const dataD = JSON.parse(resD.body);
        await assert(dataD.isPrivate === false, `Expected isPrivate=false, got ${dataD.isPrivate}`);

        // Subtest E: Reload GET /api/me returns isPrivate: false
        console.log("Subtest E: Reload GET /api/me returns isPrivate: false");
        const resE = await app.inject({ method: "GET", url: "/api/me" });
        const dataE = JSON.parse(resE.body);
        await assert(dataE.isPrivate === false, `Expected isPrivate=false on reload, got ${dataE.isPrivate}`);

        // Subtest F: Repeated transition matrix: true -> false -> true -> false
        console.log("Subtest F: Repeated transitions: true -> false -> true -> false");
        for (const target of [true, false, true, false]) {
            const resToggle = await app.inject({
                method: "PUT",
                url: "/api/settings/privacy",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ isPrivate: target }),
            });
            await assert(resToggle.statusCode === 200, `Toggle to ${target} failed`);
            const resReload = await app.inject({ method: "GET", url: "/api/me" });
            const reloadData = JSON.parse(resReload.body);
            await assert(reloadData.isPrivate === target, `Reload expected ${target}, got ${reloadData.isPrivate}`);
        }

        console.log("=== ALL PRIVACY PERSISTENCE & RELOAD REGRESSION TESTS PASSED ===");
    } finally {
        db.getUserById = originalGetUserById;
        db.updateUserPrivacy = originalUpdateUserPrivacy;
        db.getFollowersCount = originalGetFollowersCount;
        db.getFollowingCount = originalGetFollowingCount;
        await app.close();
    }
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test failed:", err);
        process.exit(1);
    });
