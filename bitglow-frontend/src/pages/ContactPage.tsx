import React, { useEffect, useState } from "react";
import { Mail, Shield, Lock, Briefcase, MessageCircle, Clock } from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportCard } from "../components/support/SupportCard";
import {
    SupportFormField,
    SupportInput,
    SupportTextarea,
    SupportSelect,
} from "../components/support/SupportFormControls";
import { SupportErrorState, SupportSuccessTicketScreen } from "../components/support/SupportStates";
import { supportService } from "../services/supportService";
import { Ticket, TicketCategory, TicketPriority } from "../types/support";
import { Button } from "../components/ui/Button";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function ContactPage() {
    useEffect(() => {
        document.title = `Contact Support · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [category, setCategory] = useState<TicketCategory>("general");
    const [priority, setPriority] = useState<TicketPriority>("normal");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

    const categories: Array<{
        value: TicketCategory;
        label: string;
        desc: string;
        icon: React.ReactNode;
        sla: string;
    }> = [
        {
            value: "general",
            label: "General Support",
            desc: "Account questions, app features, general inquiries",
            icon: <MessageCircle className="h-5 w-5 text-blue-400" />,
            sla: SUPPORT_CONFIG.sla.generalResponseTime,
        },
        {
            value: "privacy",
            label: "Privacy & Data",
            desc: "Data access requests, privacy policy inquiries",
            icon: <Shield className="h-5 w-5 text-emerald-400" />,
            sla: SUPPORT_CONFIG.sla.privacyResponseTime,
        },
        {
            value: "security",
            label: "Security Alert",
            desc: "Vulnerability disclosures, account compromise",
            icon: <Lock className="h-5 w-5 text-rose-400" />,
            sla: SUPPORT_CONFIG.sla.securityResponseTime,
        },
        {
            value: "business",
            label: "Business & Press",
            desc: "Partnership opportunities, media inquiries",
            icon: <Briefcase className="h-5 w-5 text-purple-400" />,
            sla: SUPPORT_CONFIG.sla.businessResponseTime,
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (!email.trim() || !email.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!subject.trim()) {
            setError("Please enter a subject line.");
            return;
        }

        if (!message.trim() || message.trim().length < 10) {
            setError("Please enter your message (minimum 10 characters).");
            return;
        }

        setLoading(true);

        try {
            const ticket = await supportService.submitSupportContact({
                name,
                email,
                category,
                priority,
                subject,
                message,
            });

            setSubmittedTicket(ticket);
        } catch (err: any) {
            setError(err.message || "Failed to send message. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSubmittedTicket(null);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        setError("");
    };

    return (
        <SupportLayout title="Contact Support">
            <SupportHero
                badge="Support & SLA"
                badgeColor="purple"
                title="Direct Support Line"
                description="Have a question or request for our engineering, privacy, or safety team? Send us a direct message below."
                icon={<Mail className="h-8 w-8 text-purple-400" />}
            />

            {/* Response Time SLA Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {categories.map((cat) => (
                    <div
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`flex flex-col items-start rounded-2xl border p-3.5 transition cursor-pointer ${
                            category === cat.value
                                ? "border-purple-500/50 bg-purple-500/10 text-white"
                                : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]"
                        }`}
                    >
                        <div className="mb-2">{cat.icon}</div>
                        <h4 className="text-xs font-bold text-white">{cat.label}</h4>
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                            <Clock className="h-3 w-3 shrink-0 text-purple-400" />
                            <span>{cat.sla}</span>
                        </div>
                    </div>
                ))}
            </div>

            {submittedTicket ? (
                <SupportSuccessTicketScreen ticket={submittedTicket} onReset={handleReset} />
            ) : (
                <SupportCard
                    title="Send Support Inquiry"
                    subtitle="Our team responds according to category SLAs"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SupportFormField label="Your Full Name" required>
                                <SupportInput
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Alex Mercer"
                                    required
                                />
                            </SupportFormField>

                            <SupportFormField label="Email Address" required hint="Where we send replies">
                                <SupportInput
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </SupportFormField>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SupportFormField label="Support Category" required>
                                <SupportSelect
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                                >
                                    <option value="general">General Support</option>
                                    <option value="privacy">Privacy & Data Inquiry</option>
                                    <option value="security">Security Vulnerability / Alert</option>
                                    <option value="business">Business & Partnerships</option>
                                </SupportSelect>
                            </SupportFormField>

                            <SupportFormField label="Priority Level">
                                <SupportSelect
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                                >
                                    <option value="normal">Normal Priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="urgent">Urgent (Emergency)</option>
                                </SupportSelect>
                            </SupportFormField>
                        </div>

                        <SupportFormField label="Subject" required>
                            <SupportInput
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Summary of your request"
                                required
                            />
                        </SupportFormField>

                        <SupportFormField label="Message" required hint="Provide details so we can assist you">
                            <SupportTextarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your detailed message here..."
                                rows={5}
                                required
                            />
                        </SupportFormField>

                        {error && <SupportErrorState message={error} />}

                        <Button type="submit" isLoading={loading} disabled={loading} className="w-full py-3.5">
                            Send Support Ticket
                        </Button>
                    </form>
                </SupportCard>
            )}
        </SupportLayout>
    );
}
