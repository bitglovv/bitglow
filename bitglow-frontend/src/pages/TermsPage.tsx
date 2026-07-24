import { useEffect } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function TermsPage() {
    useEffect(() => {
        document.title = `Terms of Service · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const termsSections = [
        {
            id: "account-responsibility",
            title: "1. Account Responsibility & Credentials",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        You are solely responsible for maintaining the confidentiality and security of your
                        account credentials, including your password and session tokens. Any action, post, or
                        message dispatched under your account is deemed your legal responsibility.
                    </p>
                    <p>
                        You must notify BitGlow immediately upon discovering unauthorized account access.
                        BitGlow is not liable for losses arising from uncompromised credential sharing or user
                        negligence.
                    </p>
                </div>
            ),
        },
        {
            id: "acceptable-use",
            title: "2. Acceptable Use & Conduct Policy",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        You agree not to misuse BitGlow or assist any third party in doing so. Prohibited
                        conduct includes:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
                        <li>
                            Interfering with, overloading, or reverse engineering server infrastructure or
                            WebSocket protocol endpoints.
                        </li>
                        <li>
                            Attempting unauthorized API access or exploiting vulnerabilities in authentication
                            pathways.
                        </li>
                        <li>
                            Harassing, threatening, stalking, or disseminating non-consensual personal material
                            (doxxing).
                        </li>
                        <li>Distributing malware, spamming DMs, or operating unauthorized automated scrapers.</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "content-ownership",
            title: "3. User Content & Intellectual Property",
            content: (
                <div className="space-y-2">
                    <p>
                        You retain full intellectual property ownership of posts, text, media, and attachments you
                        upload to BitGlow. By transmitting content, you grant BitGlow a worldwide, non-exclusive,
                        royalty-free license to host, store, cache, and display such content solely for operating
                        the platform.
                    </p>
                    <p>
                        You represent that you possess all necessary rights and licenses for content you publish
                        and that it does not infringe third-party copyrights or trademarks.
                    </p>
                </div>
            ),
        },
        {
            id: "service-availability",
            title: "4. Service Availability & SLA",
            content: (
                <p>
                    BitGlow is provided on an "as-is" and "as-available" basis. While we strive to maintain our
                    high availability target ({SUPPORT_CONFIG.systemStatus.uptimePercentage}), we do not
                    guarantee uninterrupted operational availability, instantaneous WebSocket reconnections under
                    adverse network conditions, or absolute data preservation in emergency disaster scenarios.
                </p>
            ),
        },
        {
            id: "termination",
            title: "5. Account Termination & Deletion",
            content: (
                <div className="space-y-2">
                    <p>
                        We reserve the right to suspend or permanently terminate user accounts that violate our
                        Acceptable Use policy, pose security risks to the network, or engage in abusive conduct.
                    </p>
                    <p>
                        You may terminate your account relationship at any time from Settings &gt; Delete Account.
                        Upon deletion, your personal record is purged from active databases.
                    </p>
                </div>
            ),
        },
        {
            id: "revisions",
            title: "6. Revisions & Notice of Modifications",
            content: (
                <p>
                    We reserve the right to update these terms to reflect legal, regulatory, or technical changes.
                    Continued usage of BitGlow following an update constitutes acceptance of revised terms.
                </p>
            ),
        },
    ];

    return (
        <SupportLayout title="Terms of Service">
            <p className="text-sm text-zinc-400">Last updated {SUPPORT_CONFIG.dates.termsLastUpdated}</p>
            <SupportAccordion items={termsSections} allowMultiple={true} />
        </SupportLayout>
    );
}
