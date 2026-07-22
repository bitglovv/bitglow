import { Resend } from 'resend';
import { env } from '../config/env';

let resend: Resend | null = null;

if (env.RESEND_API_KEY) {
    resend = new Resend(env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(email: string, token: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock sending password reset to ${email}. Token: ${token}`);
        return;
    }

    const resetLink = `${env.APP_URL}/reset-password?token=${token}`;

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
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

    const verifyLink = `${env.APP_URL}/verify-email?token=${token}`;

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
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

export async function sendSignupVerificationEmail(
    email: string,
    token: string
) {
    if (!resend) {
        console.warn(
            `[Email Service] Mock signup verification for ${email}. Token: ${token}`
        );
        return;
    }

    const verifyLink =
        `${env.APP_URL}/verify-email?token=${token}&type=signup`;

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
            to: email,
            subject: "Verify your BitGlow account",

            html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
    <h2>Welcome to BitGlow 👋</h2>

    <p>Thanks for creating your BitGlow account.</p>

    <p>Please verify your email address before signing in.</p>

    <div style="margin:32px 0">
        <a
            href="${verifyLink}"
            style="
                background:#10b981;
                color:white;
                text-decoration:none;
                padding:14px 28px;
                border-radius:8px;
                display:inline-block;
                font-weight:bold;
            ">
            Verify Email
        </a>
    </div>

    <p>This verification link expires in <b>24 hours</b>.</p>

    <hr>

    <small style="color:#666">
        If you didn't create this account,
        you can safely ignore this email.
    </small>

</div>
`,
        });

        console.log(
            "[Email Service] Signup verification email sent:",
            email
        );

    } catch (err) {

        console.error(
            "[Email Service] Signup verification failed:",
            err
        );

        throw err;
    }
}
