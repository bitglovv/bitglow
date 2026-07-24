import { db } from "../services/db";

async function runDeactivationExclusionTest() {
    console.log("=== STARTING ACCOUNT DEACTIVATION EXCLUSION & RESTORATION INTEGRATION TEST ===");

    const timestamp = Date.now();
    const activeUsername = `active_user_${timestamp}`;
    const deactivatedUsername = `deact_user_${timestamp}`;

    let activeUser: any;
    let deactUser: any;
    let postByDeact: any;
    let postByActive: any;
    let commentByDeact: any;
    let roomByDeact: any;
    let convoId: string | null = null;

    try {
        // 1. Setup Test Users
        console.log("1. Creating test users...");
        const hash = await db.hashPassword("Password123!");

        const activeRes = await db.query(
            `INSERT INTO users (username, display_name, email, password_hash, email_verified)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id, username`,
            [activeUsername, "Active User", `${activeUsername}@bitglow.site`, hash]
        );
        activeUser = activeRes.rows[0];

        const deactRes = await db.query(
            `INSERT INTO users (username, display_name, email, password_hash, email_verified)
             VALUES ($1, $2, $3, $4, true)
             RETURNING id, username`,
            [deactivatedUsername, "Deactivated User", `${deactivatedUsername}@bitglow.site`, hash]
        );
        deactUser = deactRes.rows[0];
        console.log(`✅ Created Active User (${activeUser.id}) and Target User (${deactUser.id}).`);

        // 2. Setup Relationships, Posts, Comments, DMs, Live Rooms
        console.log("2. Populating posts, comments, friends, DMs, and live rooms...");

        // Mutual Friends
        await db.query(
            `INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted'), ($2, $1, 'accepted')`,
            [activeUser.id, deactUser.id]
        );

        // Posts
        postByDeact = await db.createPost(deactUser.id, "Post by Deactivated User", "Title Deact", "public");
        postByActive = await db.createPost(activeUser.id, "Post by Active User", "Title Active", "public");

        // Comment by Deact User on Active User's Post
        commentByDeact = await db.addComment(deactUser.id, postByActive.id, "Comment by Deact User");

        // DM Conversation
        const convo = await db.getOrCreateDMConversation(activeUser.id, deactUser.id);
        convoId = convo?.id || null;
        if (convoId) {
            await db.saveDMMessage(convoId, deactUser.id, "DM Message from Deact User");
        }

        // Live Room & Message
        roomByDeact = await db.getOrCreateOwnerLiveRoom(deactUser.id);
        await db.saveLiveMessage(roomByDeact.id, deactUser.id, "Live chat message by Deact User");

        // Notification (Like by Deact User on Active User's Post)
        await db.toggleLike(deactUser.id, postByActive.id);

        console.log("✅ Populated initial data while account is ACTIVE.");

        // Verify initial visibility while active
        const preFeed = await db.getFeedPosts(activeUser.id, 50, 0);
        const preDeactInFeed = preFeed.find(p => p.id === postByDeact.id);
        if (!preDeactInFeed) throw new Error("Sanity check failed: Post by target user should be visible before deactivation.");
        console.log("✅ Sanity check passed: Target user content is visible prior to deactivation.");

        // 3. Deactivate Account (Schedule Deletion)
        console.log("3. Scheduling account deletion (Deactivating target user)...");
        await db.scheduleUserAccountDeletion(deactUser.id, "Testing exclusion logic");
        console.log("✅ Target user account deactivated (is_deleted = true).");

        // 4. Verify Total Exclusion Across BitGlow
        console.log("4. Verifying total exclusion of deactivated account across BitGlow...");

        // A. User Lookups & Search
        const searchUser = await db.findUserByUsername(deactivatedUsername);
        if (searchUser) throw new Error("FAILED: Deactivated user was returned by findUserByUsername!");

        const getUser = await db.getUserById(deactUser.id);
        if (getUser) throw new Error("FAILED: Deactivated user was returned by getUserById!");

        const allUsers = await db.getAllUsers(100, 0);
        if (allUsers.some((u: any) => u.id === deactUser.id)) {
            throw new Error("FAILED: Deactivated user was returned by getAllUsers!");
        }
        console.log("  ✅ Users search, profiles, and listings exclude deactivated account.");

        // B. Feed Posts & Can View Post
        const postCanView = await db.canViewPost(postByDeact.id, activeUser.id);
        if (postCanView) throw new Error("FAILED: canViewPost returned true for post of deactivated user!");

        const getPost = await db.getPostById(postByDeact.id, activeUser.id);
        if (getPost) throw new Error("FAILED: getPostById returned post of deactivated user!");

        const feedPosts = await db.getFeedPosts(activeUser.id, 50, 0);
        if (feedPosts.some(p => p.author.id === deactUser.id)) {
            throw new Error("FAILED: Feed posts include post by deactivated user!");
        }
        console.log("  ✅ Posts feed and single post queries exclude deactivated user content.");

        // C. Comments
        const comments = await db.getComments(postByActive.id, activeUser.id);
        if (comments && comments.some(c => c.author.id === deactUser.id)) {
            throw new Error("FAILED: Post comments include comment by deactivated user!");
        }
        console.log("  ✅ Comments list excludes comments by deactivated user.");

        // D. Friends, Followers, Following
        const friends = await db.getFriends(activeUser.id);
        if (friends.some((f: any) => f.id === deactUser.id)) {
            throw new Error("FAILED: Friends list includes deactivated user!");
        }

        const followers = await db.getFollowers(activeUser.id);
        if (followers.some((f: any) => f.id === deactUser.id)) {
            throw new Error("FAILED: Followers list includes deactivated user!");
        }

        const following = await db.getFollowing(activeUser.id);
        if (following.some((f: any) => f.id === deactUser.id)) {
            throw new Error("FAILED: Following list includes deactivated user!");
        }

        const areFriendsCheck = await db.areFriends(activeUser.id, deactUser.id);
        if (areFriendsCheck) throw new Error("FAILED: areFriends returned true for deactivated user!");
        console.log("  ✅ Friends, followers, following, and mutual checks exclude deactivated user.");

        // E. Direct Messages & Conversations
        const dms = await db.listDMConversations(activeUser.id);
        if (dms.some((c: any) => c.other_id === deactUser.id)) {
            throw new Error("FAILED: DM conversations include conversation with deactivated user!");
        }

        if (convoId) {
            const history = await db.getDMHistory(convoId);
            if (history.some((m: any) => m.sender_id === deactUser.id)) {
                throw new Error("FAILED: DM history includes messages sent by deactivated user!");
            }
        }
        console.log("  ✅ DM conversations and message history exclude deactivated user.");

        // F. Live Rooms & Messages
        const liveRooms = await db.getAccessibleLiveRooms(activeUser.id);
        if (liveRooms.some((r: any) => r?.ownerId === deactUser.id)) {
            throw new Error("FAILED: Accessible live rooms include live room of deactivated user!");
        }

        if (roomByDeact?.id) {
            const liveMsgs = await db.getLiveMessages(roomByDeact.id);
            if (liveMsgs.some(m => m.userId === deactUser.id)) {
                throw new Error("FAILED: Live messages include message by deactivated user!");
            }
        }
        console.log("  ✅ Live rooms and live stream chat messages exclude deactivated user.");

        // G. Notifications
        const notifications = await db.getNotifications(activeUser.id);
        if (notifications.some(n => n.user.id === deactUser.id)) {
            throw new Error("FAILED: Notifications include notification triggered by deactivated user!");
        }
        console.log("  ✅ Notifications exclude events from deactivated user.");

        // 5. Account Restoration
        console.log("5. Testing account restoration...");
        await db.restoreUserAccount(deactUser.id);
        console.log("✅ Account restored successfully (is_deleted = false).");

        // 6. Verify Full Visibility Restored
        const restoredUser = await db.findUserByUsername(deactivatedUsername);
        if (!restoredUser) throw new Error("FAILED: Restored user not found via findUserByUsername!");

        const restoredFeed = await db.getFeedPosts(activeUser.id, 50, 0);
        if (!restoredFeed.some(p => p.author.id === deactUser.id)) {
            throw new Error("FAILED: Restored user post did not reappear in feed!");
        }

        const restoredFriends = await db.getFriends(activeUser.id);
        if (!restoredFriends.some((f: any) => f.id === deactUser.id)) {
            throw new Error("FAILED: Restored user did not reappear in friends list!");
        }

        const restoredDms = await db.listDMConversations(activeUser.id);
        if (!restoredDms.some((c: any) => c.other_id === deactUser.id)) {
            throw new Error("FAILED: Restored user conversation did not reappear in DMs!");
        }

        console.log("✅ FULL VISIBILITY AND ACCESS RESTORED SUCCESSFULLY AFTER ACCOUNT RESTORATION!");

        console.log("🎉 ALL DEACTIVATION EXCLUSION & RESTORATION TESTS PASSED SUCCESSFULLY! 🎉");
    } catch (err) {
        console.error("❌ Test failed with error:", err);
        process.exitCode = 1;
    } finally {
        // Cleanup test data
        console.log("Cleaning up test users...");
        if (activeUser?.id) {
            await db.query("DELETE FROM posts WHERE author_id = $1", [activeUser.id]);
            await db.query("DELETE FROM users WHERE id = $1", [activeUser.id]);
        }
        if (deactUser?.id) {
            await db.query("DELETE FROM posts WHERE author_id = $1", [deactUser.id]);
            await db.query("DELETE FROM users WHERE id = $1", [deactUser.id]);
        }
        await db.close();
    }
}

runDeactivationExclusionTest();
