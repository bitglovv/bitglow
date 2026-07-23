import React, { useEffect } from "react";
import { FileText, Printer, ArrowRight } from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function TermsPage() {
    useEffect(() => {
        document.title = `Terms of Service · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    const termsSections = [
        {
            id: "account-responsibility",
            title: "1. Account Responsibility & Credentials",
            badge: "Mandatory",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        You are solely responsible for maintaining the confidentiality and security of your account credentials, 
                        including your password and session tokens. Any action, post, or message dispatched under your account 
                        is deemed your legal responsibility.
                    </p>
                    <p>
                        You must notify BitGlow immediately upon discovering unauthorized account access. BitGlow is not liable 
                        for losses arising from uncompromised credential sharing or user negligence.
                    </p>
                </div>
            ),
        },
        {
            id: "acceptable-use",
            title: "2. Acceptable Use & Conduct Policy",
            badge: "Enforced",
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        You agree not to misuse BitGlow or assist any third party in doing so. Prohibited conduct includes:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
                        <li>Interfering with, overloading, or reverse engineering server infrastructure or WebSocket protocol endpoints.</li>
                        <li>Attempting unauthorized API access or exploiting vulnerabilities in authentication pathways.</li>
                        <li>Harassing, threatening, stalking, or disseminating non-consensual personal material (doxxing).</li>
                        <li>Distributing malware, spamming DMs, or operating unauthorized automated scrapers.</li>
                    </ul>
                </div>
            ),
        },
        {
            id: "content-ownership",
            title: "3. User Content & Intellectual Property",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        You retain full intellectual property ownership of posts, text, media, and attachments you upload to BitGlow. 
                        By transmitting content, you grant BitGlow a worldwide, non-exclusive, royalty-free license to host, store, 
                        cache, and display such content solely for operating the platform.
                    </p>
                    <p>
                        You represent that you possess all necessary rights and licenses for content you publish and that it does not 
                        infringe third-party copyrights or trademarks.
                    </p>
                </div>
            ),
        },
        {
            id: "service-availability",
            title: "4. Service Availability & SLA",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        BitGlow is provided on an "as-is" and "as-available" basis. While we strive to maintain our high availability target 
                        ({SUPPORT_CONFIG.systemStatus.uptimePercentage}), we do not guarantee uninterrupted operational availability, 
                        instantaneous WebSocket reconnections under adverse network conditions, or absolute data preservation in emergency disaster scenarios.
                    </p>
                </div>
            ),
        },
        {
            id: "termination",
            title: "5. Account Termination & Deletion",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        We reserve the right to suspend or permanently terminate user accounts that violate our Acceptable Use policy, 
                        pose security risks to the network, or engage in abusive conduct.
                    </p>
                    <p>
                        You may terminate your account relationship at any time from Settings &gt; Delete Account. Upon deletion, 
                        your personal record is purged from active databases.
                    </p>
                </div>
            ),
        },
        {
            id: "revisions",
            title: "6. Revisions & Notice of Modifications",
            defaultOpen: false,
            content: (
                <div className="space-y-2">
                    <p>
                        We reserve the right to update these terms to reflect legal, regulatory, or technical changes. 
                        Continued usage of BitGlow following an update constitutes acceptance of revised terms.
                    </p>
                </div>
            ),
        },
    ];

    return (
        <SupportLayout title="Terms of Service">
            {/* Hero */}
            <SupportHero
                badge={`Last Updated ${SUPPORT_CONFIG.dates.termsLastUpdated}`}
                badgeColor="indigo"
                title="Terms of Service"
                description="Please read these legal terms carefully before using BitGlow. By registering or accessing our services, you agree to comply with these terms."
                icon={<FileText className="h-8 w-8 text-indigo-400" />}
            />

            {/* Document Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="text-xs text-zinc-400">
                    <span className="font-bold text-white">Legal Document</span> · Binding Agreement between User & BitGlow
                </div>
                <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition focus:outline-none"
                >
                    <Printer className="h-4 w-4 text-indigo-400" />
                    <span>Print Document</span>
                </button>
            </div>

            {/* Table of Contents Quick Nav */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs">
                <p className="mb-2.5 font-bold uppercase tracking-wider text-zinc-500 text-[11px]">Table of Contents</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {termsSections.map((s) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition"
                        >
                            <ArrowRight className="h-3 w-3 text-indigo-400 shrink-0" />
                            <span className="truncate">{s.title}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* Expandable Accordion Sections */}
            <SupportAccordion items={termsSections} allowMultiple={true} />

            {/* Legal Notice Footer */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 text-center text-xs text-zinc-500 space-y-1">
                <p>Have questions regarding these terms?</p>
                <p>
                    Contact our Legal Department at{" "}
                    <a href={`mailto:${SUPPORT_CONFIG.contacts.legalEmail}`} className="font-semibold text-indigo-400 hover:underline">
                        {SUPPORT_CONFIG.contacts.legalEmail}
                    </a>
                </p>
            </div>
        </SupportLayout>
    );
}
