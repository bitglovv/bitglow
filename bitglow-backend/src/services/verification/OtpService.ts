import crypto from "crypto";
import bcrypt from "bcrypt";

export class OtpService {
    /**
     * Generates a cryptographically secure 6-digit OTP code using crypto.randomInt
     */
    static generateSecureOtp(): string {
        const otpInt = crypto.randomInt(100000, 1000000);
        return otpInt.toString();
    }

    /**
     * Hashes an OTP code before saving to database (never store plaintext OTPs)
     */
    static async hashOtp(code: string): Promise<string> {
        return bcrypt.hash(code, 10);
    }

    /**
     * Compares user-supplied OTP code against stored bcrypt hash
     */
    static async compareOtp(code: string, hash: string): Promise<boolean> {
        return bcrypt.compare(code, hash);
    }
}
