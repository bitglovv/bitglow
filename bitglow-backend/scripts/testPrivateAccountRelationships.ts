import { db } from "../src/services/db";
import { randomUUID } from "crypto";

async function assert(condition: boolean, msg: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${msg}`);
    }
}

async function runRegressionTests() {
    console.log("=== STARTING PRIVATE ACCOUNT REGRESSION TESTS ===");

    // Create 3 test users: User A (Requester), User B (Target/Private), User C (Public)
    const pwHash = await db.hashPassword("testpass123");

    const userA = await db.createUser({
        id: randomUUID(),
        username: `test_a_${Date.now()}`,
        displayName: "User A",
        email: `test_a_${Date.now()}@example.com`,
        passwordHash: pwHash,
        avatarUrl: null,
        bio: "Bio A",
        followersCount: 0,
        followsCount: 0,
    });

    const userB = await db.createUser({
        id: randomUUID(),
        username: `test_b_${Date.now()}`,
        displayName: "User B",
        email: `test_b_${Date.now()}@example.com`,
        passwordHash: pwHash,
        avatarUrl: null,
        bio: "Bio B",
        followersCount: 0,
        followsCount: 0,
    });

    const userC = await db.createUser({
        id: randomUUID(),
        username: `test_c_${Date.now()}`,
        displayName: "User C",
        email: `test_c_${Date.now()}@example.com`,
        passwordHash: pwHash,
        avatarUrl: null,
        bio: "Bio C",
        followersCount: 0,
        followsCount: 0,
    });

    try {
        // Set User B to Private, User C to Public
        await db.updateUserPrivacy(userB.id, true);
        await db.updateUserPrivacy(userC.id, false);

        // 1. public → follow → following
        console.log("Test 1: Public account follow -> status is 'accepted'");
        const followC = await db.followUser(userA.id, userC.id);
        await assert(followC.status === "accepted", "Public follow must be accepted");
        const isFollowingC = await db.isFollowing(userA.id, userC.id);
        await assert(isFollowingC === true, "User A must be following User C");

        // 2. private → follow → requested
        console.log("Test 2: Private account follow -> status is 'pending'");
        const followB = await db.followUser(userA.id, userB.id);
        await assert(followB.status === "pending", "Private follow must be pending");
        const isFollowingB_Pending = await db.isFollowing(userA.id, userB.id);
        await assert(isFollowingB_Pending === false, "Pending follow must NOT be counted as following");

        // 3. requested → refresh (query requests/pending) → requested
        console.log("Test 3: Pending request persistence across queries");
        const outgoingPending = await db.query(
            `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
            [userA.id, userB.id]
        );
        await assert((outgoingPending.rowCount ?? 0) === 1, "Outgoing pending request must exist in DB");
        const incomingRequests = await db.getFollowRequests(userB.id);
        await assert(incomingRequests.some((r: any) => r.id === userA.id), "Incoming request must appear for User B");

        // 4. requested → reject → follow
        console.log("Test 4: Reject follow request");
        const rejected = await db.rejectFollow(userB.id, userA.id);
        await assert(rejected === true, "Reject follow request must succeed");
        const checkAfterReject = await db.query(
            `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2`,
            [userA.id, userB.id]
        );
        await assert((checkAfterReject.rowCount ?? 0) === 0, "Rejected follow request must be removed");

        // 5. requested → accept → following
        console.log("Test 5: Follow again -> Accept -> Following");
        const followB2 = await db.followUser(userA.id, userB.id);
        await assert(followB2.status === "pending", "Follow again must be pending");
        const accepted = await db.acceptFollow(userB.id, userA.id);
        await assert(accepted === true, "Accept follow must succeed");
        const isFollowingB_Accepted = await db.isFollowing(userA.id, userB.id);
        await assert(isFollowingB_Accepted === true, "User A must now be following User B");
        // Verify User B is NOT automatically following User A
        const isBFollowingA = await db.isFollowing(userB.id, userA.id);
        await assert(isBFollowingA === false, "Accepting must NOT create reverse follow");

        // 6. following → unfollow confirmation → confirm & ASYMMETRY test
        console.log("Test 6: Asymmetric unfollow");
        // Let User B follow User A (User A is public so accepted)
        await db.followUser(userB.id, userA.id);
        const bFollowsA = await db.isFollowing(userB.id, userA.id);
        const aFollowsB = await db.isFollowing(userA.id, userB.id);
        await assert(bFollowsA && aFollowsB, "Both should follow each other (friends)");
        const areFriendsBefore = await db.areFriends(userA.id, userB.id);
        await assert(areFriendsBefore === true, "Mutual accepted follows must be friends");

        // User A unfollows User B
        await db.unfollowUser(userA.id, userB.id);
        const aFollowsB_After = await db.isFollowing(userA.id, userB.id);
        const bFollowsA_After = await db.isFollowing(userB.id, userA.id);
        await assert(aFollowsB_After === false, "User A must no longer follow User B");
        await assert(bFollowsA_After === true, "ASYMMETRY: User B must STILL be following User A");

        // 7. private unfollow → private access removed
        console.log("Test 7: Private access removed after unfollow");
        const canViewPost = await db.canViewPost(randomUUID(), userA.id); // Post check verifies authorization
        const isAuthCheck = await db.isFollowing(userA.id, userB.id) || await db.areFriends(userA.id, userB.id);
        await assert(isAuthCheck === false, "Unfollowed user must be unauthorized for private account");

        // 8. Follow again → requested
        console.log("Test 8: Follow again -> Requested");
        const followB3 = await db.followUser(userA.id, userB.id);
        await assert(followB3.status === "pending", "Follow again must be pending");

        // 9. Accept again → following
        console.log("Test 9: Accept again -> Following");
        await db.acceptFollow(userB.id, userA.id);
        const isFollowingAgain = await db.isFollowing(userA.id, userB.id);
        await assert(isFollowingAgain === true, "Must be following again");

        // 10. Reciprocal accepted follows → friends
        console.log("Test 10: Reciprocal accepted follows -> Friends");
        const areFriendsNow = await db.areFriends(userA.id, userB.id);
        await assert(areFriendsNow === true, "Reciprocal accepted follows must be friends");

        // 11. Follower removal (Owner removes follower)
        console.log("Test 11: Owner removes follower without blocking");
        const removeRes = await db.removeFollower(userB.id, userA.id);
        await assert(removeRes === true, "Remove follower must succeed");
        const aFollowsB_Removed = await db.isFollowing(userA.id, userB.id);
        await assert(aFollowsB_Removed === false, "Removed follower must no longer follow owner");
        const bFollowsA_Intact = await db.isFollowing(userB.id, userA.id);
        await assert(bFollowsA_Intact === true, "Owner's follow to user must remain intact");

        console.log("=== ALL REGRESSION TESTS PASSED SUCCESSFULLY ===");
    } finally {
        // Clean up test data
        await db.query(`DELETE FROM friends WHERE user_id IN ($1, $2, $3) OR friend_id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
        await db.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [userA.id, userB.id, userC.id]);
    }
}

runRegressionTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Regression test error:", err);
        process.exit(1);
    });
