import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { navigateBack } from "../../utils/navigateBack";

export default function TermsPage() {
    useEffect(() => { document.title = "Terms of Service · BitGlow"; }, []);
    const navigate = useNavigate();

    const sections = [
        {
            title: "1. Account Responsibility",
            body: "You are solely responsible for maintaining the security of your account credentials. Any activity that occurs under your account is your responsibility. Do not share your password with others.",
        },
        {
            title: "2. Acceptable Use",
            body: "You agree not to misuse BitGlow or help anyone else do so. This includes: interfering with the service, attempting unauthorized access, reverse engineering the platform, or using it for harmful, abusive, illegal, or harassing activity.",
        },
        {
            title: "3. Content",
            body: "You retain ownership of the content you post on BitGlow. By posting, you grant BitGlow a non-exclusive license to display and distribute your content through the platform. You must not post content that infringes copyright or that you do not have the rights to share.",
        },
        {
            title: "4. Service Availability",
            body: "BitGlow is provided on an as-available basis. We aim to keep the service reliable and fast, but we do not guarantee 100% uptime, availability, or data continuity in every circumstance.",
        },
        {
            title: "5. Termination",
            body: "We may suspend or permanently terminate your access when your account violates these terms, creates security risks, or causes harm to the service or other users. You may also delete your account at any time from Settings.",
        },
        {
            title: "6. Changes to Terms",
            body: "We may revise these terms from time to time. Continued use of BitGlow after changes go into effect means you accept the new terms. We will make reasonable efforts to notify users of significant changes.",
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15">
                            <FileText className="h-4 w-4 text-indigo-400" />
                        </div>
                        <h1 className="text-[18px] font-bold tracking-tight">Terms of Service</h1>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-2xl px-4 py-8 pb-20 sm:px-6">
                {/* Hero */}
                <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                    <p className="text-sm leading-7 text-zinc-400">
                        Last updated <span className="font-semibold text-white">June 2025</span>. By using BitGlow, you agree to these terms. Please read them carefully.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                    {sections.map((s, i) => (
                        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                            <h2 className="mb-2 text-[15px] font-bold text-white">{s.title}</h2>
                            <p className="text-sm leading-7 text-zinc-400">{s.body}</p>
                        </div>
                    ))}
                </div>

                {/* Footer note */}
                <p className="mt-8 text-center text-xs text-zinc-600">
                    Questions? Contact us at{" "}
                    <a href="mailto:support@bitglow.app" className="text-zinc-400 underline underline-offset-4 hover:text-white">
                        support@bitglow.app
                    </a>
                </p>
            </main>
        </div>
    );
}
