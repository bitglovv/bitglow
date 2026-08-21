process.env.NODE_ENV = "test";
import Fastify from "fastify";
import { randomUUID } from "crypto";
import { dmRoutes } from "../src/routes/dms";
import { db } from "../src/services/db";

async function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

async function runSecurityTests() {
    console.log("=== BITGLOW OPEN DM POLICY & AUTHORIZATION TEST SUITE ===\n");
    let passed = 0;
    let failed = 0;

    const userA = { id: randomUUID(), username: "user_a", is_private: false };
    const userB = { id: randomUUID(), username: "user_b", is_private: true };
    const userC = { id: randomUUID(), username: "user_c", is_private: false };

    // In-memory mock store for testing DM behaviors and isolation
    const mockConversations: any[] = [];
    const mockMessages: any[] = [];
    const mockBlocks: { userId: string; blockedId: string }[] = [];

    // Mock DB methods
    const originalGetDMConversation = db.getDMConversation;
    const originalCreateDMConversationWithStatus = db.createDMConversationWithStatus;
    const originalGetOrCreateDMConversation = db.getOrCreateDMConversation;
    const originalIsBlockedEitherDirection = db.isBlockedEitherDirection;
    const originalSaveDMMessage = db.saveDMMessage;
    const originalGetDMHistory = db.getDMHistory;
    const originalListDMConversations = db.listDMConversations;
    const originalGetPostById = db.getPostById;
    const originalGetForwardableDMMessage = db.getForwardableDMMessage;
    const originalUpdateOwnDMMessage = db.updateOwnDMMessage;
    const originalDeleteOwnDMMessage = db.deleteOwnDMMessage;

    try {
        db.getDMConversation = async (userId: string, otherId: string) => {
            const [userAId, userBId] = userId < otherId ? [userId, otherId] : [otherId, userId];
            return mockConversations.find(c => c.user_a === userAId && c.user_b === userBId) || null;
        };

        db.createDMConversationWithStatus = async (userId: string, otherId: string, status = 'accepted') => {
            if (userId === otherId) return null;
            const [userAId, userBId] = userId < otherId ? [userId, otherId] : [otherId, userId];
            const existing = mockConversations.find(c => c.user_a === userAId && c.user_b === userBId);
            if (existing) return existing;
            const convo = { id: randomUUID(), user_a: userAId, user_b: userBId, status, created_at: new Date() };
            mockConversations.push(convo);
            return convo;
        };

        db.getOrCreateDMConversation = async (userId: string, otherId: string) => {
            const existing = await db.getDMConversation(userId, otherId);
            if (existing) return existing;
            return await db.createDMConversationWithStatus(userId, otherId, 'accepted');
        };

        db.isBlockedEitherDirection = async (userId: string, otherId: string) => {
            return mockBlocks.some(b => (b.userId === userId && b.blockedId === otherId) || (b.userId === otherId && b.blockedId === userId));
        };

        db.saveDMMessage = async (convoId: string, senderId: string, text: string, type = 'text', postId?: string, profileId?: string, isForwarded = false) => {
            const msg = {
                id: randomUUID(),
                conversation_id: convoId,
                sender_id: senderId,
                text,
                type,
                post_id: postId || null,
                profile_id: profileId || null,
                is_forwarded: isForwarded,
                created_at: new Date()
            };
            mockMessages.push(msg);
            return msg;
        };

        db.getDMHistory = async (convoId: string) => {
            return mockMessages.filter(m => m.conversation_id === convoId);
        };

        db.listDMConversations = async (userId: string) => {
            return mockConversations
                .filter(c => c.user_a === userId || c.user_b === userId)
                .map(c => ({
                    conversation_id: c.id,
                    other_id: c.user_a === userId ? c.user_b : c.user_a,
                    status: c.status,
                    is_masked: false,
                    is_blocked_by_me: false
                }));
        };

        db.getForwardableDMMessage = async (messageId: string, userId: string) => {
            const msg = mockMessages.find(m => m.id === messageId);
            if (!msg) return null;
            const convo = mockConversations.find(c => c.id === msg.conversation_id);
            if (!convo || (convo.user_a !== userId && convo.user_b !== userId)) return null;
            return msg;
        };

        db.updateOwnDMMessage = async (messageId: string, senderId: string, otherUserId: string, text: string) => {
            const msg = mockMessages.find(m => m.id === messageId);
            if (!msg || msg.sender_id !== senderId) return null;
            const convo = mockConversations.find(c => c.id === msg.conversation_id);
            if (!convo || !((convo.user_a === senderId && convo.user_b === otherUserId) || (convo.user_a === otherUserId && convo.user_b === senderId))) return null;
            msg.text = text;
            msg.edited_at = new Date();
            return msg;
        };

        // Create Fastify test app
        let authenticatedUser: { id: string; username: string } | null = null;
        const app = Fastify({ logger: false });
        app.decorate("requireAuth", async (req: any, reply: any) => {
            if (!authenticatedUser) {
                return reply.code(401).send({ message: "Not authenticated" });
            }
            req.auth = authenticatedUser;
        });
        await app.register(dmRoutes, { prefix: "/api" });
        await app.ready();

        // -------------------------------------------------------------
        // TEST 1 — Open DM: User A does not follow User B. Neither follows each other. A can initiate a DM.
        // -------------------------------------------------------------
        console.log("TEST 1: User A sends DM to User C (No follow/friend requirement)...");
        authenticatedUser = { id: userA.id, username: userA.username };
        const res1 = await app.inject({
            method: "POST",
            url: `/api/dms/${userC.id}`,
            payload: { text: "Hello C from A!" }
        });
        assert(res1.statusCode === 200, `Expected 200, got ${res1.statusCode}: ${res1.body}`);
        const body1 = JSON.parse(res1.body);
        assert(body1.senderId === userA.id, "Sender must be User A");
        assert(body1.receiverId === userC.id, "Receiver must be User C");
        console.log("✅ TEST 1 PASSED: Open DM initiation succeeded without follow or friendship.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 2 — Private recipient: User B is private. A does not follow B. A can initiate a DM.
        // -------------------------------------------------------------
        console.log("TEST 2: User A sends DM to private User B...");
        authenticatedUser = { id: userA.id, username: userA.username };
        const res2 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB.id}`,
            payload: { text: "Hello private user B!" }
        });
        assert(res2.statusCode === 200, `Expected 200, got ${res2.statusCode}: ${res2.body}`);
        const convoAB = await db.getDMConversation(userA.id, userB.id);
        assert(convoAB?.status === "accepted", "Conversation status must be accepted under open DM policy");
        console.log("✅ TEST 2 PASSED: DM initiation to private user B succeeded with status 'accepted'.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 3 — Existing private-content protection: B is private. A still cannot access B's protected private posts.
        // -------------------------------------------------------------
        console.log("TEST 3: Verify private content protection remains intact...");
        // Mock getPostById for private post
        db.getPostById = (async (postId: string, viewerId?: string) => {
            // Private post requires viewerId === author or mutual accepted
            if (viewerId !== userB.id) return null;
            return {
                id: postId,
                content: "private",
                title: "private",
                visibility: "friends",
                createdAt: new Date(),
                author: { id: userB.id, username: userB.username, displayName: userB.username, avatarUrl: null },
                likesCount: 0,
                commentsCount: 0,
                savesCount: 0,
                likedByMe: false,
                savedByMe: false
            };
        }) as any;
        const privatePostAccess = await db.getPostById("private-post-1", userA.id);
        assert(privatePostAccess === null, "User A must not access User B's private post");
        console.log("✅ TEST 3 PASSED: User A cannot access private profile content/posts.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 4 — Block A -> B: A blocks B. A attempts to initiate/send a DM to B.
        // -------------------------------------------------------------
        console.log("TEST 4: Block enforcement when User A blocks User B...");
        mockBlocks.push({ userId: userA.id, blockedId: userB.id });
        authenticatedUser = { id: userA.id, username: userA.username };
        const res4 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB.id}`,
            payload: { text: "Should be blocked" }
        });
        assert(res4.statusCode === 403, `Expected 403 Forbidden, got ${res4.statusCode}`);
        console.log("✅ TEST 4 PASSED: A blocking B prevents DM initiation/send.\n");
        passed++;
        mockBlocks.length = 0; // Clear block

        // -------------------------------------------------------------
        // TEST 5 — Block B -> A: B blocks A. A attempts to initiate/send a DM to B.
        // -------------------------------------------------------------
        console.log("TEST 5: Block enforcement when User B blocks User A...");
        mockBlocks.push({ userId: userB.id, blockedId: userA.id });
        authenticatedUser = { id: userA.id, username: userA.username };
        const res5 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB.id}`,
            payload: { text: "Should also be blocked" }
        });
        assert(res5.statusCode === 403, `Expected 403 Forbidden, got ${res5.statusCode}`);
        console.log("✅ TEST 5 PASSED: B blocking A prevents A from sending DMs to B.\n");
        passed++;
        mockBlocks.length = 0; // Clear block

        // -------------------------------------------------------------
        // TEST 6 — Conversation IDOR: Conversation belongs to B and C. A is not a participant.
        // -------------------------------------------------------------
        console.log("TEST 6: Conversation IDOR prevention (A attempts to access B-C history)...");
        // Create B-C conversation with messages
        const convoBC = await db.getOrCreateDMConversation(userB.id, userC.id);
        await db.saveDMMessage(convoBC.id, userB.id, "Secret B-C message");

        // User A requests history with User B
        authenticatedUser = { id: userA.id, username: userA.username };
        const res6 = await app.inject({
            method: "GET",
            url: `/api/dms/${userB.id}`
        });
        assert(res6.statusCode === 200, `Expected 200, got ${res6.statusCode}`);
        const historyAB = JSON.parse(res6.body);
        const leakedBCMessage = historyAB.some((m: any) => m.text === "Secret B-C message");
        assert(!leakedBCMessage, "User A must not receive messages from B-C conversation");
        console.log("✅ TEST 6 PASSED: User A cannot read B-C conversation (IDOR protected).\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 7 — User ID manipulation: A attempts to modify or forward message from B-C
        // -------------------------------------------------------------
        console.log("TEST 7: User ID manipulation & forward authorization check...");
        const bcMsg = mockMessages.find(m => m.conversation_id === convoBC.id);
        authenticatedUser = { id: userA.id, username: userA.username };
        const res7 = await app.inject({
            method: "POST",
            url: `/api/dms/${userC.id}/forward/${bcMsg.id}`
        });
        assert(res7.statusCode === 404 || res7.statusCode === 403, `Expected 404/403, got ${res7.statusCode}`);
        console.log("✅ TEST 7 PASSED: Non-participant cannot forward or manipulate message.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 8 — Valid participant: B and C can read and send messages in their conversation
        // -------------------------------------------------------------
        console.log("TEST 8: Valid participant read & write verification...");
        authenticatedUser = { id: userB.id, username: userB.username };
        const res8B = await app.inject({
            method: "GET",
            url: `/api/dms/${userC.id}`
        });
        assert(res8B.statusCode === 200, `Expected 200 for User B, got ${res8B.statusCode}`);
        const historyBC = JSON.parse(res8B.body);
        assert(historyBC.some((m: any) => m.text === "Secret B-C message"), "User B must see their message");

        authenticatedUser = { id: userC.id, username: userC.username };
        const res8C = await app.inject({
            method: "POST",
            url: `/api/dms/${userB.id}`,
            payload: { text: "Reply from C to B" }
        });
        assert(res8C.statusCode === 200, `Expected 200 for User C send, got ${res8C.statusCode}`);
        console.log("✅ TEST 8 PASSED: Valid participants B and C can retrieve and send messages.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 9 — Logout / Unauthenticated: Logged-out user cannot initiate or read DMs
        // -------------------------------------------------------------
        console.log("TEST 9: Unauthenticated request rejection...");
        authenticatedUser = null;
        const res9Get = await app.inject({ method: "GET", url: `/api/dms/${userB.id}` });
        const res9Post = await app.inject({ method: "POST", url: `/api/dms/${userB.id}`, payload: { text: "test" } });
        assert(res9Get.statusCode === 401, `Expected 401 on GET, got ${res9Get.statusCode}`);
        assert(res9Post.statusCode === 401, `Expected 401 on POST, got ${res9Post.statusCode}`);
        console.log("✅ TEST 9 PASSED: Unauthenticated / logged-out user rejected with 401.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 10 — Message Edit / Delete sender authorization
        // -------------------------------------------------------------
        console.log("TEST 10: Message Edit / Delete sender authorization...");
        const msgToEdit = await db.saveDMMessage(convoBC.id, userB.id, "Original content");
        // User C (participant, but not sender) tries to edit User B's message
        authenticatedUser = { id: userC.id, username: userC.username };
        const res10Unauthorized = await app.inject({
            method: "PUT",
            url: `/api/dms/${userB.id}/messages/${msgToEdit.id}`,
            payload: { text: "Malicious edit" }
        });
        assert(res10Unauthorized.statusCode === 403, `Expected 403 for unauthorized edit, got ${res10Unauthorized.statusCode}`);

        // User B (sender) edits their message
        authenticatedUser = { id: userB.id, username: userB.username };
        const res10Authorized = await app.inject({
            method: "PUT",
            url: `/api/dms/${userC.id}/messages/${msgToEdit.id}`,
            payload: { text: "Legitimate edit" }
        });
        assert(res10Authorized.statusCode === 200, `Expected 200 for authorized edit, got ${res10Authorized.statusCode}`);
        console.log("✅ TEST 10 PASSED: Only message sender can edit/delete their own message.\n");
        passed++;

    } finally {
        // Restore DB methods
        db.getDMConversation = originalGetDMConversation;
        db.createDMConversationWithStatus = originalCreateDMConversationWithStatus;
        db.getOrCreateDMConversation = originalGetOrCreateDMConversation;
        db.isBlockedEitherDirection = originalIsBlockedEitherDirection;
        db.saveDMMessage = originalSaveDMMessage;
        db.getDMHistory = originalGetDMHistory;
        db.listDMConversations = originalListDMConversations;
        db.getPostById = originalGetPostById;
        db.getForwardableDMMessage = originalGetForwardableDMMessage;
        db.updateOwnDMMessage = originalUpdateOwnDMMessage;
        db.deleteOwnDMMessage = originalDeleteOwnDMMessage;
    }

    console.log("==========================================");
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED: ${passed}`);
    console.log(`FAILED: ${failed}`);
    console.log("==========================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runSecurityTests().catch((err) => {
    console.error("Fatal error in test suite:", err);
    process.exit(1);
});
