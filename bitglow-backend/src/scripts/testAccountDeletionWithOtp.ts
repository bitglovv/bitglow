import { randomUUID } from "crypto";
import { db, initializeDatabase } from "../services/db";
import { VerificationService } from "../services/verification/VerificationService";
import { OtpService } from "../services/verification/OtpService";

async function runAccountDeletionWithOtpTest() {
    console.log("=== STARTING MULTI-FACTOR ACCOUNT DELETION INTEGRATION TEST ===");

    try {
        await initializeDatabase();

        const testUsername = `test_del_otp_${Date.now()}`;
        const testEmail = `${testUsername}@bitglow.site`;
        const testPassword = "TestPassword123!";

        console.log(`1. Creating test user: ${testUsername}`);
        const passwordHash = await db.hashPassword(testPassword);
        const testUser = await db.createUser({
            id: randomUUID(),
            username: testUsername,
            displayName: "Test Deletion OTP",
            email: testEmail,
            passwordHash,
        });
        console.log("✅ Test user created:", testUser.id);

        console.log("2. Requesting deletion OTP via VerificationService...");
        const otpReq = await VerificationService.requestVerification(
            testUser.id,
            "delete_account",
            "email",
            { ipAddress: "127.0.0.1", userAgent: "AccountDeletionTestRunner" }
        );
        if (!otpReq.ok) {
            throw new Error("Failed to request deletion OTP code.");
        }
        console.log("✅ Deletion OTP requested and challenge dispatched.");

        console.log("3. Fetching generated OTP code from database...");
        const verifQuery = await db.query(
            `SELECT id, otp_hash FROM action_verifications WHERE user_id = $1 AND verification_type = 'delete_account'`,
            [testUser.id]
        );
        if (verifQuery.rows.length === 0) {
            throw new Error("Failed: No verification record found in action_verifications table.");
        }

        const knownOtp = "789123";
        const knownHash = await OtpService.hashOtp(knownOtp);
        await db.query(
            `UPDATE action_verifications SET otp_hash = $1 WHERE id = $2`,
            [knownHash, verifQuery.rows[0].id]
        );
        console.log("✅ Verification record retrieved and test hash synchronized.");

        console.log("4. Testing invalid OTP verification for account deletion...");
        const badVerify = await VerificationService.verifyCode(testUser.id, "delete_account", "000000");
        if (badVerify.success !== false) {
            throw new Error("Failed: Invalid OTP code was accepted!");
        }
        console.log("✅ Invalid OTP code correctly rejected.");

        console.log("5. Testing valid OTP verification for account deletion...");
        const goodVerify = await VerificationService.verifyCode(testUser.id, "delete_account", knownOtp);
        if (!goodVerify.success) {
            throw new Error(`Failed: Valid OTP code was rejected: ${goodVerify.message}`);
        }
        console.log("✅ Valid OTP code verified successfully.");

        console.log("6. Executing account deletion & session revocation...");
        const result = await db.scheduleUserAccountDeletion(testUser.id, "Test Deletion", {
            ipAddress: "127.0.0.1",
            userAgent: "AccountDeletionTestRunner",
        });
        await db.revokeSessionsForUser(testUser.id);
        console.log("✅ Account scheduled for deletion on:", result.scheduled_deletion_at);

        console.log("7. Verifying account is deactivated & hidden...");
        const deletedUser = await db.findUserByLoginIdentifier(testUsername);
        if (!deletedUser || !deletedUser.is_deleted) {
            throw new Error("Failed: User account is_deleted flag is not set to true!");
        }
        console.log("✅ Account deactivated: is_deleted = true.");

        console.log("8. Verifying all user sessions were revoked...");
        const sessionsRes = await db.query("SELECT id FROM user_sessions WHERE user_id = $1", [testUser.id]);
        if ((sessionsRes.rowCount ?? 0) > 0) {
            throw new Error("Failed: User sessions were not revoked upon deletion scheduling!");
        }
        console.log("✅ All user sessions and refresh tokens revoked.");

        console.log("9. Cleaning up test user...");
        await db.deleteUserAccount(testUser.id);
        console.log("✅ Test cleanup complete.");

        console.log("\n==========================================================");
        console.log("🎉 MULTI-FACTOR ACCOUNT DELETION TEST PASSED SUCCESSFULLY! 🎉");
        console.log("==========================================================");
    } catch (err) {
        console.error("❌ Account deletion test failed:", err);
        process.exit(1);
    } finally {
        await db.close();
    }
}

runAccountDeletionWithOtpTest();
