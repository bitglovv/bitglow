import React, { useEffect } from "react";
import { Shield, Printer, ArrowRight, Lock, Eye, Server, UserCheck } from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SupportCard } from "../components/support/SupportCard";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function PrivacyPage() {
    useEffect(() => {
        document.title = `Privacy Policy · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    const privacySections = [
        {
            id: "data-collection",
            title: "1. Data We Collect & Technical Information",
            badge: "Transparent",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        BitGlow collects account information supplied during registration (username, email address, password hash via bcrypt), 
                        optional profile parameters (displayName, bio, website, location, avatar), and essential technical telemetry 
                        (IP address, browser user-agent, session identifiers) strictly required to maintain secure authentication and WebSocket sessions.
                    </p>
                </div>
            ),
        },
        {
            id: "cookies-session",
            title: "2. Session Storage & Local Authentication Tokens",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        We use JSON Web Tokens (JWT) stored securely in your browser's local storage to maintain authenticated states. 
                        We do not employ third-party tracking cookies or advertising pixels.
                    </p>
                </div>
            ),
        },
        {
            id: "data-usage",
            title: "3. How Your Data Is Utilized",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        Your personal data is used exclusively to power BitGlow core features — authenticating your identity, 
                        delivering real-time messages and posts, operating Live Spaces, enforcing your privacy toggles (Private Account & Online Status), 
                        and mitigating security threats. We never sell your personal data to ad networks or data brokers.
                    </p>
                </div>
            ),
        },
        {
            id: "data-sharing",
            title: "4. Data Sharing & Infrastructure Providers",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        We do not share your personal information with external entities except infrastructure providers essential for service delivery 
                        (e.g., PostgreSQL database hosting, Render application servers, Resend transactional email services). 
                        All providers operate under strict confidentiality agreements.
                    </p>
                </div>
            ),
        },
        {
            id: "user-rights",
            title: "5. Your Privacy Rights & Data Control",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        You retain full authority over your data. At any time, you may:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
                        <li>Toggle your account to <strong>Private Mode</strong> to require manual approval for followers.</li>
                        <li>Disable your <strong>Online Status</strong> presence indicator across messaging and chat lists.</li>
                        <li>Mute or Block users to prevent unwanted interaction.</li>
                        <li>Permanently delete your account from Settings &gt; Delete Account.</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "security-protocols",
            title: "6. Security Architecture & Encryption",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        BitGlow implements industry-standard safeguards including bcrypt password hashing, token expiration mechanisms, 
                        HTTPS transport security, rate-limiting on sensitive auth routes, and session revocation capabilities.
                    </p>
                </div>
            ),
        },
    ];

    return (
        <SupportLayout title="Privacy Policy">
            {/* Hero */}
            <SupportHero
                badge={`Last Updated ${SUPPORT_CONFIG.dates.privacyLastUpdated}`}
                badgeColor="emerald"
                title="Privacy Policy"
                description="We believe social connections shouldn't come at the cost of your privacy. Here is a clear breakdown of what data we handle and how you control it."
                icon={<Shield className="h-8 w-8 text-emerald-400" />}
            />

            {/* Document Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="text-xs text-zinc-400">
                    <span className="font-bold text-white">Privacy Commitment</span> · Zero Data Sale Guarantee
                </div>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition focus:outline-none"
                >
                    <Printer className="h-4 w-4 text-emerald-400" />
                    <span>Print Policy</span>
                </button>
            </div>

            {/* Privacy Pillars Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SupportCard headerBorder={false} className="p-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/20 shrink-0">
                            <Lock className="h-4.5 w-4.5 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white">Zero Tracking Cookies</h4>
                            <p className="text-[11px] text-zinc-400">JWT-only auth in browser storage</p>
                        </div>
                    </div>
                </SupportCard>

                <SupportCard headerBorder={false} className="p-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/20 shrink-0">
                            <Eye className="h-4.5 w-4.5 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white">Online Status Control</h4>
                            <p className="text-[11px] text-zinc-400">Hide presence anytime from settings</p>
                        </div>
                    </div>
                </SupportCard>

                <SupportCard headerBorder={false} className="p-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20 shrink-0">
                            <UserCheck className="h-4.5 w-4.5 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-white">Private Account Mode</h4>
                            <p className="text-[11px] text-zinc-400">Manual follower approval</p>
                        </div>
                    </div>
                </SupportCard>
            </div>

            {/* Table of Contents */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs">
                <p className="mb-2.5 font-bold uppercase tracking-wider text-zinc-500 text-[11px]">Table of Contents</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {privacySections.map((s) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition"
                        >
                            <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{s.title}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Policy Accordions */}
            <SupportAccordion items={privacySections} allowMultiple={true} />

            {/* Contact Footer */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-center text-xs text-zinc-500 space-y-1">
                <p>For privacy inquiries or data requests:</p>
                <p>
                    Email Data Officer at{" "}
                    <a href={`mailto:${SUPPORT_CONFIG.contacts.privacyEmail}`} className="font-semibold text-emerald-400 hover:underline">
                        {SUPPORT_CONFIG.contacts.privacyEmail}
                    </a>
                </p>
            </div>
        </SupportLayout>
    );
}
