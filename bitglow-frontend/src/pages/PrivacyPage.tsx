import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { navigateBack } from "../../utils/navigateBack";

export default function PrivacyPage() {
    useEffect(() => { document.title = "Privacy Policy · BitGlow"; }, []);
    const navigate = useNavigate();

    const sections = [
        {
            title: "Data We Collect",
            body: "BitGlow collects account information you provide during sign-up (username, email, password hash), profile details you add (bio, avatar, website, location), and technical information required to keep authentication, messaging, and live sessions working reliably.",
        },
        {
            title: "Cookies & Session Data",
            body: "We use JWT tokens stored in your browser's local storage to keep you signed in. We may also use similar technologies to remember session state, improve reliability across devices and reconnects, and keep your feed preferences intact.",
        },
        {
            title: "How Your Data Is Used",
            body: "Your information is used exclusively to operate BitGlow — securing your account, delivering product features like posts, messages and live rooms, monitoring service reliability, and responding to support or safety issues. We do not sell your data.",
        },
        {
            title: "Data Sharing",
            body: "We do not share your personal information with third parties for advertising purposes. We may share data with service providers (e.g. Supabase for database, Render for hosting) only as needed to run the platform, and they are bound by confidentiality obligations.",
        },
        {
            title: "Your Rights",
            body: "You can update or delete your account at any time from Settings. Upon account deletion, your personal data is removed from our active database. Some anonymized records may be retained for security audit logs for a limited period.",
        },
        {
            title: "Security",
            body: "We use industry-standard practices including password hashing (bcrypt), JWT-based authentication, and HTTPS everywhere. While we take security seriously, no system is 100% secure and we cannot guarantee absolute security.",
        },
        {
            title: "Contact",
            body: "For privacy questions or data requests, email us at support@bitglow.app. We will respond within 7 business days.",
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => navigateBack(navigate, "/settings")}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white transition hover:bg-white/[0.10] active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15">
                            <Shield className="h-4 w-4 text-emerald-400" />
                        </div>
                        <h1 className="text-[18px] font-bold tracking-tight">Privacy Policy</h1>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6">
                {/* Hero */}
                <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                    <p className="text-sm leading-7 text-zinc-400">
                        Last updated <span className="font-semibold text-white">June 2025</span>. BitGlow is committed to protecting your privacy. This policy explains what we collect and how we use it.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                    {sections.map((s, i) => (
                        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                            <h2 className="mb-2 text-[15px] font-bold text-white">{s.title}</h2>
                            <p className="text-sm leading-7 text-zinc-400">
                                {s.title === "Contact" ? (
                                    <>
                                        For privacy questions or data requests, email us at{" "}
                                        <a href="mailto:support@bitglow.app" className="text-white underline underline-offset-4 hover:text-emerald-400 transition">
                                            support@bitglow.app
                                        </a>
                                        . We will respond within 7 business days.
                                    </>
                                ) : s.body}
                            </p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
