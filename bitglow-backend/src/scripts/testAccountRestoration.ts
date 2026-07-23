import { randomUUID } from "crypto";
import { db, initializeDatabase } from "../services/db";
import { sendRestorationOtpEmail } from "../services/email";

async function runAccountRestorationIntegrationTest() {
    console.log("=== STARTING ACCOUNT RESTORATION INTEGRATION TEST ===");

    try {
        await initializeDatabase();

        const testUsername = `test_restore_${Date.now()}`;
        const testEmail = `${testUsername}@bitglow.site`;
        const testPassword = "TestPassword123!";

        console.log(`1. Creating test user: ${testUsername} (${testEmail})`);
        const passwordHash = await db.hashPassword(testPassword);
        const testUser = await db.createUser({
            id: randomUUID(),
            username: testUsername,
            displayName: "Test Restore",
            email: testEmail,
            passwordHash,
        });
        console.log("✅ Test user created:", testUser.id);

        console.log("2. Scheduling account for deletion (30 days grace period)...");
        await db.scheduleUserAccountDeletion(testUser.id, "Integration test deletion", {
            ipAddress: "127.0.0.1",
            userAgent: "NodeTestRunner",
        });

        const deletedCheck = await db.findUserByLoginIdentifier(testUsername);
        if (!deletedCheck || !deletedCheck.is_deleted) {
            throw new Error("Failed: User is_deleted flag was not set to true");
        }
        console.log("✅ Account scheduled for deletion successfully.");

        console.log("3. Generating restoration OTP code...");
        const otpCode = "654321";
        await db.createRestorationOtp(testUser.id, otpCode);
        console.log("✅ Restoration OTP stored in DB.");

        console.log("4. Testing OTP email dispatch service...");
        await sendRestorationOtpEmail(testEmail, testUsername, otpCode);
        console.log("✅ Email dispatch service executed cleanly.");

        console.log("5. Testing OTP verification with invalid code...");
        const badVerify = await db.verifyRestorationOtp(testUser.id, "000000");
        if (badVerify !== false) {
            throw new Error("Failed: Invalid OTP code was incorrectly accepted!");
        }
        console.log("✅ Invalid OTP correctly rejected.");

        console.log("6. Testing OTP verification with valid code...");
        const goodVerify = await db.verifyRestorationOtp(testUser.id, otpCode);
        if (goodVerify !== true) {
            throw new Error("Failed: Valid OTP code was rejected!");
        }
        console.log("✅ Valid OTP accepted and marked as used.");

        console.log("7. Restoring user account...");
        await db.restoreUserAccount(testUser.id, {
            ipAddress: "127.0.0.1",
            userAgent: "NodeTestRunner",
        });

        const restoredUser = await db.findUserByLoginIdentifier(testUsername);
        if (!restoredUser || restoredUser.is_deleted) {
            throw new Error("Failed: User account is_deleted flag is still true after restoration!");
        }
        console.log("✅ Account restored successfully! is_deleted = false.");

        console.log("8. Cleaning up test user...");
        await db.deleteUserAccount(testUser.id);
        console.log("✅ Test cleanup complete.");

        console.log("\n===============================================");
        console.log("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
        console.log("===============================================");
    } catch (err) {
        console.error("❌ Integration test failed:", err);
        process.exit(1);
    } finally {
        await db.close();
    }
}

runAccountRestorationIntegrationTest();
