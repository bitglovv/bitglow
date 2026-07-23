import { db } from "../db";
import { OtpService } from "./OtpService";
import { EmailOtpProvider } from "./EmailOtpProvider";
import {
    HighRiskActionType,
    VerificationMethod,
    VerificationProvider,
    VerificationResult,
} from "./verificationTypes";

export class VerificationService {
    private static providers: Map<VerificationMethod, VerificationProvider> = new Map([
        ['email', new EmailOtpProvider()],
    ]);

    /**
     * Registers a new verification provider (for future extension: totp, passkey, webauthn)
     */
    public static registerProvider(provider: VerificationProvider): void {
        this.providers.set(provider.method, provider);
    }

    /**
     * Requests a new verification challenge for a high-risk action.
     * Enforces rate-limiting, generates a 6-digit OTP, stores hashed value, and sends challenge.
     */
    public static async requestVerification(
        userId: string,
        verificationType: HighRiskActionType,
        method: VerificationMethod = 'email',
        auditContext?: { ipAddress?: string; userAgent?: string }
    ): Promise<{ ok: boolean; message: string; expiresAt?: string }> {
        // Fetch authenticated user details
        const user = await db.getUserById(userId);
        if (!user) {
            throw new Error("User not found for verification request.");
        }

        // Rate limiting check: Max 1 request per 60 seconds per user & action type
        const recentReq = await db.query(
            `SELECT created_at FROM action_verifications
             WHERE user_id = $1 AND verification_type = $2
               AND created_at >= NOW() - INTERVAL '60 seconds'
             ORDER BY created_at DESC LIMIT 1`,
            [userId, verificationType]
        );

        if (recentReq.rows.length > 0) {
            await db.insertSecurityLog({
                userId,
                eventType: "verification_rate_limited",
                ipAddress: auditContext?.ipAddress,
                userAgent: auditContext?.userAgent,
                details: { verificationType, method, reason: "cooldown_60s" },
            });
            throw new Error("Please wait 60 seconds before requesting another verification code.");
        }

        // Rate limiting check: Max 5 requests per hour per user & action type
        const hourlyReq = await db.query(
            `SELECT COUNT(*)::int AS count FROM action_verifications
             WHERE user_id = $1 AND verification_type = $2
               AND created_at >= NOW() - INTERVAL '1 hour'`,
            [userId, verificationType]
        );

        if ((hourlyReq.rows[0]?.count || 0) >= 5) {
            await db.insertSecurityLog({
                userId,
                eventType: "verification_rate_limited",
                ipAddress: auditContext?.ipAddress,
                userAgent: auditContext?.userAgent,
                details: { verificationType, method, reason: "max_hourly_exceeded" },
            });
            throw new Error("Too many verification requests. Please try again in one hour.");
        }

        // Generate secure 6-digit OTP code & hash it
        const otpCode = OtpService.generateSecureOtp();
        const otpHash = await OtpService.hashOtp(otpCode);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes lifetime

        // Invalidate previous unused codes for this action
        await db.query(
            `UPDATE action_verifications
             SET used_at = NOW()
             WHERE user_id = $1 AND verification_type = $2 AND used_at IS NULL`,
            [userId, verificationType]
        );

        // Store hashed OTP in database
        await db.query(
            `INSERT INTO action_verifications
             (user_id, verification_type, method, otp_hash, expires_at, attempts, max_attempts)
             VALUES ($1, $2, $3, $4, $5, 0, 5)`,
            [userId, verificationType, method, otpHash, expiresAt.toISOString()]
        );

        // Dispatch challenge via provider
        const provider = this.providers.get(method);
        if (!provider) {
            throw new Error(`Unsupported verification method: ${method}`);
        }

        await provider.sendChallenge(userId, user.email, user.username, otpCode, verificationType);

        // Log security event
        await db.insertSecurityLog({
            userId,
            eventType: "verification_requested",
            ipAddress: auditContext?.ipAddress,
            userAgent: auditContext?.userAgent,
            details: { verificationType, method, expiresAt: expiresAt.toISOString() },
        });

        return {
            ok: true,
            message: `Verification code sent via ${method}.`,
            expiresAt: expiresAt.toISOString(),
        };
    }

    /**
     * Verifies a user-supplied OTP code for a high-risk action.
     * Enforces lifetime (10 mins), max attempts (5), single-use invalidation, and security logging.
     */
    public static async verifyCode(
        userId: string,
        verificationType: HighRiskActionType,
        inputCode: string,
        auditContext?: { ipAddress?: string; userAgent?: string }
    ): Promise<VerificationResult> {
        if (!inputCode || inputCode.trim().length !== 6) {
            return {
                success: false,
                reason: "INVALID_CODE",
                message: "Please enter a valid 6-digit verification code.",
            };
        }

        const normalizedCode = inputCode.trim();

        // Fetch latest active verification record for user & action
        const res = await db.query(
            `SELECT id, otp_hash, expires_at, attempts, max_attempts, used_at
             FROM action_verifications
             WHERE user_id = $1 AND verification_type = $2
             ORDER BY created_at DESC LIMIT 1`,
            [userId, verificationType]
        );

        if (res.rows.length === 0) {
            return {
                success: false,
                reason: "NOT_FOUND",
                message: "No verification request found. Please request a new code.",
            };
        }

        const record = res.rows[0];

        if (record.used_at) {
            return {
                success: false,
                reason: "ALREADY_USED",
                message: "This verification code has already been used. Please request a new code.",
            };
        }

        if (new Date(record.expires_at).getTime() < Date.now()) {
            return {
                success: false,
                reason: "EXPIRED",
                message: "Verification code has expired. Please request a new code.",
            };
        }

        if (record.attempts >= record.max_attempts) {
            await db.insertSecurityLog({
                userId,
                eventType: "verification_max_attempts_exceeded",
                ipAddress: auditContext?.ipAddress,
                userAgent: auditContext?.userAgent,
                details: { verificationType, attempts: record.attempts },
            });

            return {
                success: false,
                reason: "MAX_ATTEMPTS_EXCEEDED",
                message: "Maximum verification attempts exceeded. Please request a new code.",
                attemptsLeft: 0,
            };
        }

        // Increment attempts counter
        const newAttempts = record.attempts + 1;
        await db.query(
            `UPDATE action_verifications SET attempts = $1 WHERE id = $2`,
            [newAttempts, record.id]
        );

        // Compare input code against stored bcrypt hash
        const isMatch = await OtpService.compareOtp(normalizedCode, record.otp_hash);

        if (!isMatch) {
            const attemptsLeft = record.max_attempts - newAttempts;
            await db.insertSecurityLog({
                userId,
                eventType: "verification_failed",
                ipAddress: auditContext?.ipAddress,
                userAgent: auditContext?.userAgent,
                details: { verificationType, attempts: newAttempts, attemptsLeft },
            });

            if (attemptsLeft <= 0) {
                return {
                    success: false,
                    reason: "MAX_ATTEMPTS_EXCEEDED",
                    message: "Maximum verification attempts exceeded. Please request a new code.",
                    attemptsLeft: 0,
                };
            }

            return {
                success: false,
                reason: "INVALID_CODE",
                message: `Incorrect verification code. ${attemptsLeft} attempt(s) remaining.`,
                attemptsLeft,
            };
        }

        // Code match! Mark as used (single use)
        await db.query(
            `UPDATE action_verifications SET used_at = NOW() WHERE id = $1`,
            [record.id]
        );

        // Security Log
        await db.insertSecurityLog({
            userId,
            eventType: "verification_succeeded",
            ipAddress: auditContext?.ipAddress,
            userAgent: auditContext?.userAgent,
            details: { verificationType, attempts: newAttempts },
        });

        return {
            success: true,
            message: "Verification successful.",
            attemptsLeft: record.max_attempts - newAttempts,
        };
    }
}
