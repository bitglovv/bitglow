import { Resend } from 'resend';
import { env } from '../config/env';

let resend: Resend | null = null;

if (env.RESEND_API_KEY) {
    resend = new Resend(env.RESEND_API_KEY);
}

// In production, we'll want to use a real domain.
// For now, testing with Resend's onboarding domain is fine if the user is testing to their own email,
// but they'll need a verified domain to send to arbitrary emails.
const FROM_EMAIL = 'BitGlow <onboarding@resend.dev>';

export async function sendPasswordResetEmail(email: string, token: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock sending password reset to ${email}. Token: ${token}`);
        return;
    }

    // Find the first HTTPS origin for production, fallback to local
    const frontendUrl = env.CORS_ORIGINS.find(url => url.startsWith('https://')) || env.CORS_ORIGINS[0] || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Reset Your BitGlow Password',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Reset your password</h2>
                    <p>We received a request to reset the password for your BitGlow account.</p>
                    <p>Click the button below to reset it. This link expires in 30 minutes.</p>
                    <div style="margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `
        });
    } catch (error) {
        console.error('[Email Service] Failed to send password reset email:', error);
    }
}

export async function sendEmailChangeVerification(email: string, token: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock sending email verification to ${email}. Token: ${token}`);
        return;
    }

    const frontendUrl = env.CORS_ORIGINS.find(url => url.startsWith('https://')) || env.CORS_ORIGINS[0] || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Verify your new BitGlow email address',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Verify your new email</h2>
                    <p>You requested to change your BitGlow email address to this one.</p>
                    <p>Click the button below to confirm the change. This link expires in 30 minutes.</p>
                    <div style="margin: 30px 0;">
                        <a href="${verifyLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email and your account will remain unchanged.</p>
                </div>
            `
        });
    } catch (error) {
        console.error('[Email Service] Failed to send email verification:', error);
    }
}

export async function sendSignupVerificationEmail(email: string, token: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock sending signup verification to ${email}. Token: ${token}`);
        return;
    }

    const frontendUrl = env.CORS_ORIGINS.find(url => url.startsWith('https://')) || env.CORS_ORIGINS[0] || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email?token=${token}&type=signup`;

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: 'Verify your BitGlow account',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Welcome to BitGlow!</h2>
                    <p>Thanks for creating an account. Please verify your email address to get started.</p>
                    <p>Click the button below to verify. This link expires in 24 hours.</p>
                    <div style="margin: 30px 0;">
                        <a href="${verifyLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Verify Email
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
                </div>
            `
        });
    } catch (error) {
        console.error('[Email Service] Failed to send signup verification email:', error);
    }
}
