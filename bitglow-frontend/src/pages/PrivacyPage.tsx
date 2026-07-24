import { useEffect } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function PrivacyPage() {
    useEffect(() => {
        document.title = `Privacy Policy · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const privacySections = [
        {
            id: "data-collection",
            title: "1. Data We Collect & Technical Information",
            defaultOpen: true,
            content: (
                <p>
                    BitGlow collects account information supplied during registration (username, email address,
                    password hash via bcrypt), optional profile parameters (displayName, bio, website, location,
                    avatar), and essential technical telemetry (IP address, browser user-agent, session
                    identifiers) strictly required to maintain secure authentication and WebSocket sessions.
                </p>
            ),
        },
        {
            id: "cookies-session",
            title: "2. Session Storage & Local Authentication Tokens",
            defaultOpen: true,
            content: (
                <p>
                    We use JSON Web Tokens (JWT) stored securely in your browser's local storage to maintain
                    authenticated states. We do not employ third-party tracking cookies or advertising pixels.
                </p>
            ),
        },
        {
            id: "data-usage",
            title: "3. How Your Data Is Utilized",
            content: (
                <p>
                    Your personal data is used exclusively to power BitGlow core features — authenticating your
                    identity, delivering real-time messages and posts, operating Live Spaces, enforcing your
                    privacy toggles (Private Account & Online Status), and mitigating security threats. We
                    never sell your personal data to ad networks or data brokers.
                </p>
            ),
        },
        {
            id: "data-sharing",
            title: "4. Data Sharing & Infrastructure Providers",
            content: (
                <p>
                    We do not share your personal information with external entities except infrastructure
                    providers essential for service delivery (e.g., PostgreSQL database hosting, Render
                    application servers, Resend transactional email services). All providers operate under strict
                    confidentiality agreements.
                </p>
            ),
        },
        {
            id: "user-rights",
            title: "5. Your Privacy Rights & Data Control",
            content: (
                <div className="space-y-2">
                    <p>You retain full authority over your data. At any time, you may:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
                        <li>
                            Toggle your account to <strong>Private Mode</strong> to require manual approval for
                            followers.
                        </li>
                        <li>
                            Disable your <strong>Online Status</strong> presence indicator across messaging and
                            chat lists.
                        </li>
                        <li>Mute or Block users to prevent unwanted interaction.</li>
                        <li>Permanently delete your account from Settings &gt; Delete Account.</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "security-protocols",
            title: "6. Security Architecture & Encryption",
            content: (
                <p>
                    BitGlow implements industry-standard safeguards including bcrypt password hashing, token
                    expiration mechanisms, HTTPS transport security, rate-limiting on sensitive auth routes, and
                    session revocation capabilities.
                </p>
            ),
        },
    ];

    return (
        <SupportLayout title="Privacy Policy">
            <p className="text-sm text-zinc-400">Last updated {SUPPORT_CONFIG.dates.privacyLastUpdated}</p>
            <SupportAccordion items={privacySections} allowMultiple={true} />
        </SupportLayout>
    );
}
