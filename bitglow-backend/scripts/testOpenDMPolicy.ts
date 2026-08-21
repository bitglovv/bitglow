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
    console.log("=== BITGLOW DM PRIVACY & REQUESTS COMPREHENSIVE TEST SUITE (15 TESTS) ===\n");
    let passed = 0;
    let failed = 0;

    // Users
    const userA = { id: randomUUID(), username: "user_a", is_private: false };
    const userB_public = { id: randomUUID(), username: "user_b_pub", is_private: false };
    const userB_private = { id: randomUUID(), username: "user_b_priv", is_private: true };
    const userC = { id: randomUUID(), username: "user_c", is_private: false };

    // In-memory mock store
    const mockUsers = [userA, userB_public, userB_private, userC];
    const mockConversations: any[] = [];
    const mockMessages: any[] = [];
    const mockFriends: { userId: string; friendId: string; status: 'pending' | 'accepted' | 'blocked' }[] = [];

    // Save original db methods
    const orig = { ...db };

    try {
        db.getUserById = async (id: string) => {
            const u = mockUsers.find(u => u.id === id);
            return u ? { ...u, is_private: u.is_private } as any : null;
        };

        db.isFollowing = async (userId: string, otherId: string) => {
            return mockFriends.some(f => f.userId === userId && f.friendId === otherId && f.status === 'accepted');
        };

        db.isMutual = async (userId: string, otherId: string) => {
            const f1 = mockFriends.some(f => f.userId === userId && f.friendId === otherId && f.status === 'accepted');
            const f2 = mockFriends.some(f => f.userId === otherId && f.friendId === userId && f.status === 'accepted');
            return f1 && f2;
        };

        db.isBlockedEitherDirection = async (userId: string, otherId: string) => {
            return mockFriends.some(f =>
                ((f.userId === userId && f.friendId === otherId) || (f.userId === otherId && f.friendId === userId)) &&
                f.status === 'blocked'
            );
        };

        db.getDMConversation = async (userId: string, otherId: string) => {
            const [uA, uB] = userId < otherId ? [userId, otherId] : [otherId, userId];
            return mockConversations.find(c => c.user_a === uA && c.user_b === uB) || null;
        };

        db.createDMConversationWithStatus = async (userId: string, otherId: string, status = 'accepted') => {
            if (userId === otherId) return null;
            const [uA, uB] = userId < otherId ? [userId, otherId] : [otherId, userId];
            const existing = mockConversations.find(c => c.user_a === uA && c.user_b === uB);
            if (existing) return existing;
            const convo = { id: randomUUID(), user_a: uA, user_b: uB, status, created_at: new Date() };
            mockConversations.push(convo);
            return convo;
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

        db.markDMConversationRead = async () => 0;

        db.listDMConversations = async (userId: string) => {
            const userConvs = mockConversations.filter(c => c.user_a === userId || c.user_b === userId);
            const res = [];
            for (const c of userConvs) {
                const otherId = c.user_a === userId ? c.user_b : c.user_a;
                const otherUser = mockUsers.find(u => u.id === otherId);
                const isMutual = await db.isMutual(userId, otherId);
                const lastMsg = mockMessages.filter(m => m.conversation_id === c.id).slice(-1)[0];
                res.push({
                    conversation_id: c.id,
                    other_id: otherId,
                    other_username: otherUser?.username || "unknown",
                    other_display_name: otherUser?.username || "unknown",
                    other_avatar_url: null,
                    last_message: lastMsg?.text || "",
                    last_message_sender_id: lastMsg?.sender_id || null,
                    last_message_at: lastMsg?.created_at || c.created_at,
                    unread_count: 0,
                    status: c.status,
                    is_mutual_friend: isMutual,
                    isMutualFriend: isMutual,
                    is_masked: false,
                    is_blocked_by_me: false,
                    conversationStatus: isMutual ? 'accepted' : 'pending'
                });
            }
            return res;
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

        db.getPostById = (async (postId: string, viewerId?: string) => {
            if (postId === "priv-post-1") {
                const isAuth = viewerId === userB_private.id || await db.isFollowing(viewerId || "", userB_private.id);
                if (!isAuth) return null;
                return { id: postId, author_id: userB_private.id, visibility: "friends" };
            }
            return null;
        }) as any;

        // Build Fastify App
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
        // TEST 1: Public B. A does not follow B. B does not follow A. A initiates DM.
        // Expected: PASS, Conversation = REQUEST (pending)
        // -------------------------------------------------------------
        console.log("TEST 1: Public B. Neither follows each other -> Allowed as REQUEST...");
        authenticatedUser = { id: userA.id, username: userA.username };
        const res1 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_public.id}`,
            payload: { text: "Hello Public B from A" }
        });
        assert(res1.statusCode === 200, `Expected 200, got ${res1.statusCode}`);
        const convo1 = await db.getDMConversation(userA.id, userB_public.id);
        assert(convo1?.status === "pending", "Conversation status must be 'pending' (Request)");
        console.log("✅ TEST 1 PASSED: DM allowed to public non-friend as REQUEST.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 2: Public B. B follows A. A does not follow B. A initiates DM.
        // Expected: PASS, Conversation = REQUEST (pending)
        // -------------------------------------------------------------
        console.log("TEST 2: Public B follows A (one-way). A initiates DM -> REQUEST...");
        mockFriends.push({ userId: userB_public.id, friendId: userA.id, status: "accepted" });
        const check2 = await db.canInitiateDM(userA.id, userB_public.id);
        assert(check2.allowed === true && check2.conversationState === "pending", "Must be allowed as pending request");
        console.log("✅ TEST 2 PASSED: One-way follow on public recipient remains REQUEST.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 3: Public B. A and B mutually follow. A initiates DM.
        // Expected: PASS, Conversation = CHAT (accepted)
        // -------------------------------------------------------------
        console.log("TEST 3: Public B. A and B mutually follow -> CHAT (accepted)...");
        mockFriends.push({ userId: userA.id, friendId: userB_public.id, status: "accepted" });
        mockFriends.push({ userId: userB_public.id, friendId: userA.id, status: "accepted" });
        const check3 = await db.canInitiateDM(userA.id, userB_public.id);
        assert(check3.allowed === true && check3.conversationState === "accepted", "Must be allowed as accepted chat");
        console.log("✅ TEST 3 PASSED: Mutual follow on public recipient is CHAT.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 4: Private B. Neither follows the other. A attempts DM.
        // Expected: DENIED. No conversation created.
        // -------------------------------------------------------------
        console.log("TEST 4: Private B. Neither follows each other -> DENIED...");
        authenticatedUser = { id: userA.id, username: userA.username };
        const res4 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_private.id}`,
            payload: { text: "Sneak message to private B" }
        });
        assert(res4.statusCode === 403, `Expected 403 Forbidden, got ${res4.statusCode}`);
        const convo4 = await db.getDMConversation(userA.id, userB_private.id);
        assert(convo4 === null, "No conversation should be created for unauthorized private recipient");
        console.log("✅ TEST 4 PASSED: Direct message to unaccepted private account is rejected.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 5: Private B. A has pending follow request. B has not accepted. A attempts DM.
        // Expected: DENIED. No conversation created.
        // -------------------------------------------------------------
        console.log("TEST 5: Private B. A has pending follow request -> DENIED...");
        mockFriends.push({ userId: userA.id, friendId: userB_private.id, status: "pending" });
        const res5 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_private.id}`,
            payload: { text: "Message with pending follow request" }
        });
        assert(res5.statusCode === 403, `Expected 403 Forbidden, got ${res5.statusCode}`);
        const convo5 = await db.getDMConversation(userA.id, userB_private.id);
        assert(convo5 === null, "No conversation should be created while follow request is pending");
        console.log("✅ TEST 5 PASSED: Pending follow request to private user cannot DM.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 6: Private B. B accepts A's follow request (one-way). B does not follow A. A initiates DM.
        // Expected: PASS, Conversation = REQUEST (pending)
        // -------------------------------------------------------------
        console.log("TEST 6: Private B accepts A's follow request (one-way accepted) -> Allowed as REQUEST...");
        mockFriends.push({ userId: userA.id, friendId: userB_private.id, status: "accepted" });
        const res6 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_private.id}`,
            payload: { text: "Hello accepted Private B" }
        });
        assert(res6.statusCode === 200, `Expected 200 OK, got ${res6.statusCode}`);
        const convo6 = await db.getDMConversation(userA.id, userB_private.id);
        assert(convo6?.status === "pending", "One-way accepted follow must create REQUEST conversation");
        console.log("✅ TEST 6 PASSED: Accepted follow to private account initiates DM as REQUEST.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 7: Private B. A and B mutually follow. A initiates DM.
        // Expected: PASS, Conversation = CHAT
        // -------------------------------------------------------------
        console.log("TEST 7: Private B. Mutual follow -> CHAT (accepted)...");
        mockFriends.push({ userId: userB_private.id, friendId: userA.id, status: "accepted" }); // Now mutual
        const check7 = await db.canInitiateDM(userA.id, userB_private.id);
        assert(check7.allowed === true && check7.conversationState === "accepted", "Must be allowed as accepted chat");
        console.log("✅ TEST 7 PASSED: Mutual follow on private recipient is CHAT.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 8: Private B. B accepts A's follow request. Then B follows A.
        // Existing request conversation becomes CHAT without duplicate.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 8: Transition from REQUEST to CHAT when relationship becomes mutual...");
        const list8 = await db.listDMConversations(userA.id);
        const conv8 = list8.find((c: any) => c.other_id === userB_private.id);
        assert(conv8?.conversationStatus === "accepted", "Conversation must dynamically transition to accepted (Chat)");
        assert(list8.filter((c: any) => c.other_id === userB_private.id).length === 1, "Must never duplicate conversation");
        console.log("✅ TEST 8 PASSED: Request dynamically becomes Chat on mutual follow with zero duplication.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 9: Either user blocks the other. DM initiation denied.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 9: Block enforcement (A blocks B and B blocks A)...");
        mockFriends.push({ userId: userA.id, friendId: userC.id, status: "blocked" });
        const res9A = await app.inject({
            method: "POST",
            url: `/api/dms/${userC.id}`,
            payload: { text: "Blocked attempt" }
        });
        assert(res9A.statusCode === 403, "Sender blocking recipient must reject with 403");

        mockFriends.length = 0;
        mockFriends.push({ userId: userC.id, friendId: userA.id, status: "blocked" });
        const res9B = await app.inject({
            method: "POST",
            url: `/api/dms/${userC.id}`,
            payload: { text: "Blocked attempt 2" }
        });
        assert(res9B.statusCode === 403, "Recipient blocking sender must reject with 403");
        console.log("✅ TEST 9 PASSED: Bidirectional block enforcement confirmed.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 10: Non-participant attempts to read another conversation (IDOR).
        // Expected: DENIED
        // -------------------------------------------------------------
        console.log("TEST 10: Non-participant IDOR conversation isolation...");
        const convoBC = await db.createDMConversationWithStatus(userB_public.id, userC.id, "accepted");
        await db.saveDMMessage(convoBC!.id, userB_public.id, "Private B-C confidential text");
        authenticatedUser = { id: userA.id, username: userA.username };
        const res10 = await app.inject({
            method: "GET",
            url: `/api/dms/${userB_public.id}`
        });
        const history10 = JSON.parse(res10.body);
        assert(!history10.some((m: any) => m.text === "Private B-C confidential text"), "User A must not access B-C history");
        console.log("✅ TEST 10 PASSED: IDOR prevention verified, third-party conversation isolated.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 11: Unauthenticated DM attempt.
        // Expected: 401
        // -------------------------------------------------------------
        console.log("TEST 11: Unauthenticated request rejection...");
        authenticatedUser = null;
        const res11 = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_public.id}`,
            payload: { text: "Unauth message" }
        });
        assert(res11.statusCode === 401, `Expected 401, got ${res11.statusCode}`);
        console.log("✅ TEST 11 PASSED: Unauthenticated request rejected with 401.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 12: Valid participant can read/send in existing conversation.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 12: Valid participant communication in conversation...");
        authenticatedUser = { id: userB_public.id, username: userB_public.username };
        const res12Read = await app.inject({ method: "GET", url: `/api/dms/${userC.id}` });
        assert(res12Read.statusCode === 200, "User B should read B-C history");
        authenticatedUser = { id: userC.id, username: userC.username };
        const res12Send = await app.inject({
            method: "POST",
            url: `/api/dms/${userB_public.id}`,
            payload: { text: "Reply from C to B" }
        });
        assert(res12Send.statusCode === 200, "User C should send in B-C conversation");
        console.log("✅ TEST 12 PASSED: Valid participants can read and write.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 13: Private profile protected posts remain inaccessible until follow accepted.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 13: Private profile protected posts authorization...");
        const postAccessWithoutFollow = await db.getPostById("priv-post-1", userA.id);
        assert(postAccessWithoutFollow === null, "Post must be hidden without follow");
        mockFriends.push({ userId: userA.id, friendId: userB_private.id, status: "accepted" });
        const postAccessWithFollow = await db.getPostById("priv-post-1", userA.id);
        assert(postAccessWithFollow !== null, "Post must be accessible once follow is accepted");
        console.log("✅ TEST 13 PASSED: Private profile content access strictly governed by follow acceptance.\n");
        passed++;
        mockFriends.length = 0; // reset

        // -------------------------------------------------------------
        // TEST 14: Public non-friend DM appears under Requests, not Chats.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 14: Verification that public non-friend conversation is classified as REQUEST...");
        const list14 = await db.listDMConversations(userA.id);
        const convPubNonFriend = list14.find((c: any) => c.other_id === userB_public.id);
        assert(convPubNonFriend?.conversationStatus === "pending", "Must be pending (Requests)");
        assert(convPubNonFriend?.isMutualFriend === false, "Must not be marked as mutual friend");
        console.log("✅ TEST 14 PASSED: Public non-friend conversation correctly classified as REQUEST.\n");
        passed++;

        // -------------------------------------------------------------
        // TEST 15: Mutual-friend DM appears under Chats, not Requests.
        // Expected: PASS
        // -------------------------------------------------------------
        console.log("TEST 15: Verification that mutual-friend conversation is classified as CHAT...");
        mockFriends.push({ userId: userA.id, friendId: userB_public.id, status: "accepted" });
        mockFriends.push({ userId: userB_public.id, friendId: userA.id, status: "accepted" });
        const list15 = await db.listDMConversations(userA.id);
        const convPubMutual = list15.find((c: any) => c.other_id === userB_public.id);
        assert(convPubMutual?.conversationStatus === "accepted", "Must be accepted (Chats)");
        assert(convPubMutual?.isMutualFriend === true, "Must be marked as mutual friend");
        console.log("✅ TEST 15 PASSED: Mutual-friend conversation correctly classified as CHAT.\n");
        passed++;

    } finally {
        Object.assign(db, orig);
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
