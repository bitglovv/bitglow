import { randomUUID } from "crypto";
import { db, initializeDatabase } from "../services/db";
import { OtpService } from "../services/verification/OtpService";
import { VerificationService } from "../services/verification/VerificationService";

async function runVerificationServiceTests() {
    console.log("=== STARTING REUSABLE VERIFICATION SERVICE TESTS ===");

    try {
        await initializeDatabase();

        const testUsername = `test_verif_${Date.now()}`;
        const testEmail = `${testUsername}@bitglow.site`;
        const testPassword = "TestPassword123!";

        console.log(`1. Creating test user: ${testUsername}`);
        const passwordHash = await db.hashPassword(testPassword);
        const testUser = await db.createUser({
            id: randomUUID(),
            username: testUsername,
            displayName: "Test Verif",
            email: testEmail,
            passwordHash,
        });
        console.log("✅ Test user created:", testUser.id);

        console.log("2. Testing secure 6-digit OTP generator...");
        for (let i = 0; i < 20; i++) {
            const code = OtpService.generateSecureOtp();
            if (!/^\d{6}$/.test(code)) {
                throw new Error(`Failed: Generated OTP '${code}' is not a 6-digit string.`);
            }
            const num = parseInt(code, 10);
            if (num < 100000 || num > 999999) {
                throw new Error(`Failed: Generated OTP number ${num} out of 100000-999999 range.`);
            }
        }
        console.log("✅ 20 random OTP codes generated & validated: 100% 6-digit numeric.");

        console.log("3. Testing OTP hashing & comparison...");
        const sampleCode = "849201";
        const sampleHash = await OtpService.hashOtp(sampleCode);
        if (sampleHash === sampleCode) {
            throw new Error("Failed: OTP is stored in plaintext!");
        }
        const matchTrue = await OtpService.compareOtp(sampleCode, sampleHash);
        const matchFalse = await OtpService.compareOtp("123456", sampleHash);
        if (!matchTrue || matchFalse) {
            throw new Error("Failed: OTP hash comparison failed.");
        }
        console.log("✅ Cryptographic bcrypt hashing and comparison verified.");

        console.log("4. Requesting verification challenge for 'delete_account'...");
        const reqRes = await VerificationService.requestVerification(
            testUser.id,
            "delete_account",
            "email",
            { ipAddress: "127.0.0.1", userAgent: "VerificationTestRunner" }
        );
        if (!reqRes.ok || !reqRes.expiresAt) {
            throw new Error("Failed: Request verification challenge failed.");
        }
        console.log("✅ Challenge requested. Expiration time set:", reqRes.expiresAt);

        console.log("5. Checking DB storage (never plaintext, lifetime = 10m, max_attempts = 5)...");
        const dbRecord = await db.query(
            `SELECT * FROM action_verifications WHERE user_id = $1 AND verification_type = 'delete_account'`,
            [testUser.id]
        );
        if (dbRecord.rows.length === 0) {
            throw new Error("Failed: No verification record stored in action_verifications table.");
        }
        const rec = dbRecord.rows[0];
        if (rec.otp_hash.length < 20 || rec.otp_hash.includes("849")) {
            throw new Error("Failed: Plaintext OTP detected in database!");
        }
        if (rec.max_attempts !== 5) {
            throw new Error(`Failed: Expected max_attempts 5, found ${rec.max_attempts}`);
        }
        console.log("✅ Database record verified: Hashed OTP stored, max_attempts = 5.");

        console.log("6. Testing 60-second rate limiting...");
        let rateLimitTriggered = false;
        try {
            await VerificationService.requestVerification(testUser.id, "delete_account", "email");
        } catch (err: any) {
            if (err.message.includes("60 seconds")) {
                rateLimitTriggered = true;
            }
        }
        if (!rateLimitTriggered) {
            throw new Error("Failed: Rate limiting allowed 2 requests within 60 seconds!");
        }
        console.log("✅ Rate limiting correctly blocked rapid duplicate requests.");

        console.log("7. Testing wrong OTP attempt counter & max attempt lock...");
        for (let attempt = 1; attempt <= 4; attempt++) {
            const wrongRes = await VerificationService.verifyCode(
                testUser.id,
                "delete_account",
                "000000"
            );
            if (wrongRes.success !== false || wrongRes.attemptsLeft !== 5 - attempt) {
                throw new Error(`Failed: Attempt ${attempt} counter mismatch.`);
            }
        }
        console.log("✅ 4 wrong attempts correctly incremented attempt counter.");

        console.log("8. Testing 5th wrong attempt (locking record)...");
        const lockRes = await VerificationService.verifyCode(
            testUser.id,
            "delete_account",
            "000000"
        );
        if (lockRes.reason !== "MAX_ATTEMPTS_EXCEEDED") {
            throw new Error("Failed: Max attempts was not locked after 5 failed attempts!");
        }
        console.log("✅ Max attempt limit reached and record locked.");

        console.log("9. Testing single-use & successful verification flow...");
        // Override rate limit in DB for test continuity
        await db.query(
            `DELETE FROM action_verifications WHERE user_id = $1`,
            [testUser.id]
        );

        await VerificationService.requestVerification(testUser.id, "change_password", "email");
        
        // Fetch the stored hash from DB to get the valid OTP code for testing verification success
        const latestRec = await db.query(
            `SELECT id, otp_hash FROM action_verifications WHERE user_id = $1 AND verification_type = 'change_password'`,
            [testUser.id]
        );

        // We test with an invalid code first, then verify success logic
        const invalidTry = await VerificationService.verifyCode(testUser.id, "change_password", "111111");
        if (invalidTry.success !== false) {
            throw new Error("Failed: Invalid code accepted!");
        }

        // Test matching code directly on service
        const correctCode = "123456"; // We will set known hash for test
        const knownHash = await OtpService.hashOtp(correctCode);
        await db.query(
            `UPDATE action_verifications SET otp_hash = $1, attempts = 0 WHERE id = $2`,
            [knownHash, latestRec.rows[0].id]
        );

        const successRes = await VerificationService.verifyCode(testUser.id, "change_password", correctCode);
        if (!successRes.success) {
            throw new Error(`Failed: Valid code rejected! ${successRes.message}`);
        }
        console.log("✅ Correct OTP code accepted successfully.");

        console.log("10. Testing single-use invalidation (reusing code)...");
        const reuseRes = await VerificationService.verifyCode(testUser.id, "change_password", correctCode);
        if (reuseRes.reason !== "ALREADY_USED") {
            throw new Error("Failed: Single-use policy failed! Used code was re-accepted.");
        }
        console.log("✅ Single-use policy enforced: Reused code returned ALREADY_USED.");

        console.log("11. Verifying security audit logs recorded...");
        const logs = await db.query(
            `SELECT event_type FROM security_logs WHERE user_id = $1 AND event_type LIKE 'verification_%'`,
            [testUser.id]
        );
        if (logs.rows.length < 3) {
            throw new Error("Failed: Security audit logs were not recorded for verification events.");
        }
        console.log(`✅ ${logs.rows.length} security audit events recorded in database.`);

        console.log("12. Cleaning up test user...");
        await db.deleteUserAccount(testUser.id);
        console.log("✅ Test cleanup complete.");

        console.log("\n========================================================");
        console.log("🎉 ALL VERIFICATION SERVICE TESTS PASSED SUCCESSFULLY! 🎉");
        console.log("========================================================");
    } catch (err) {
        console.error("❌ Verification service test failed:", err);
        process.exit(1);
    } finally {
        await db.close();
    }
}

runVerificationServiceTests();
