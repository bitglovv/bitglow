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

export async function sendAccountDeletionEmail(
    email: string,
    username: string,
    scheduledDateStr: string
) {
    if (!resend) {
        console.warn(`[Email Service] Mock account deletion email to ${email}. Scheduled purge: ${scheduledDateStr}`);
        return;
    }

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
            to: email,
            subject: "Your BitGlow account has been scheduled for deletion",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #333;">
                    <h2>Account Deletion Requested ⚠️</h2>
                    <p>Hello @${username},</p>
                    <p>Your request to delete your BitGlow account has been received. Your profile and content have been deactivated and hidden immediately.</p>
                    <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <strong style="color: #856404;">30-Day Grace Period:</strong>
                        <p style="margin: 8px 0 0 0; color: #856404;">Your account and data will be permanently purged on <b>${scheduledDateStr}</b>.</p>
                    </div>
                    <p>If you change your mind, you can cancel this deletion and restore your account at any time within the 30-day grace period simply by logging into your account.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <small style="color: #666;">If you did not request this deletion, please log in immediately to secure and restore your account.</small>
                </div>
            `,
        });
    } catch (err) {
        console.error("[Email Service] Account deletion email failed:", err);
    }
}

export async function sendAccountRestoredEmail(email: string, username: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock account restoration email to ${email}.`);
        return;
    }

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
            to: email,
            subject: "Your BitGlow account has been restored 🎉",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #333;">
                    <h2>Welcome back to BitGlow 👋</h2>
                    <p>Hello @${username},</p>
                    <p>Your account restoration request was successful. Your scheduled account deletion has been canceled, and all your posts, profile details, and features have been fully reactivated.</p>
                    <p style="margin-top: 24px;">Thank you for staying with BitGlow!</p>
                </div>
            `,
        });
    } catch (err) {
        console.error("[Email Service] Account restoration email failed:", err);
    }
}

export async function sendRestorationOtpEmail(email: string, username: string, otpCode: string) {
    if (!resend) {
        console.warn(`[Email Service] Mock restoration OTP email to ${email} (@${username}). Code: ${otpCode}`);
        return;
    }

    try {
        await resend.emails.send({
            from: env.FROM_EMAIL,
            to: email,
            subject: "Your BitGlow Account Restoration Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; color: #333;">
                    <h2>Account Restoration Ownership Verification 🛡️</h2>
                    <p>Hello @${username},</p>
                    <p>You requested to restore your BitGlow account which is currently scheduled for deletion.</p>
                    <p>Use the following 6-digit verification code to confirm ownership and reactivate your account:</p>
                    <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">
                            ${otpCode}
                        </span>
                    </div>
                    <p style="color: #666; font-size: 14px;">This code will expire in <b>15 minutes</b>. Do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <small style="color: #888;">If you did not request to restore your account, please ignore this email.</small>
                </div>
            `,
        });
        console.log(`[Email Service] Restoration OTP email sent to ${email}`);
    } catch (err) {
        console.error("[Email Service] Failed to send restoration OTP email:", err);
    }
}
