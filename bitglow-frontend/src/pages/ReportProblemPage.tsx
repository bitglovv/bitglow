import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportCard } from "../components/support/SupportCard";
import {
    SupportFormField,
    SupportInput,
    SupportTextarea,
    SupportFileUpload,
    SupportDeviceBox,
} from "../components/support/SupportFormControls";
import { SupportErrorState, SupportSuccessTicketScreen } from "../components/support/SupportStates";
import { supportService } from "../services/supportService";
import { Ticket, TicketCategory, TicketDeviceInfo } from "../types/support";
import { Button } from "../components/ui/Button";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function ReportProblemPage() {
    useEffect(() => {
        document.title = `Report a Problem · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const [category, setCategory] = useState<TicketCategory>("bug");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [reportedUsername, setReportedUsername] = useState("");
    const [reportedPostId, setReportedPostId] = useState("");
    const [deviceInfo, setDeviceInfo] = useState<TicketDeviceInfo>(() =>
        supportService.getDeviceInfo()
    );
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

    const categories: Array<{ value: TicketCategory; label: string; emoji: string; desc: string }> = [
        { value: "bug", label: "App Bug / Error", emoji: "🐛", desc: "Unexpected behavior, crashes, or broken UI" },
        { value: "account", label: "Account / Security", emoji: "🚨", desc: "Login problems, session issues, impersonation" },
        { value: "post", label: "Post / Content", emoji: "📝", desc: "Violating media, abusive posts, copyright" },
        { value: "general", label: "Performance / Other", emoji: "⚡", desc: "Slow loading, WebSocket disconnects" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!subject.trim()) {
            setError("Please enter a subject line.");
            return;
        }

        if (!description.trim() || description.trim().length < 10) {
            setError("Please provide a detailed description (minimum 10 characters).");
            return;
        }

        setLoading(true);

        try {
            const ticket = await supportService.submitProblemReport({
                category,
                subject,
                description,
                reportedUsername,
                reportedPostId,
                deviceInfo,
                attachments: attachedFiles.map((f) => ({ name: f.name, size: f.size })),
            });

            setSubmittedTicket(ticket);
        } catch (err: any) {
            setError(err.message || "Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSubmittedTicket(null);
        setSubject("");
        setDescription("");
        setReportedUsername("");
        setReportedPostId("");
        setAttachedFiles([]);
        setError("");
    };

    return (
        <SupportLayout title="Report a Problem">
            <SupportHero
                badge="Quality & Moderation"
                badgeColor="orange"
                title="Report a Problem"
                description="Encountered a bug, technical glitch, or policy violation? Submit a ticket below and our engineering & safety team will inspect it."
                icon={<AlertTriangle className="h-8 w-8 text-orange-400" />}
            />

            {submittedTicket ? (
                <SupportSuccessTicketScreen ticket={submittedTicket} onReset={handleReset} />
            ) : (
                <SupportCard
                    title="Submit Problem Ticket"
                    subtitle="Auto-captures technical diagnostics to speed up resolution"
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Category Selector Grid */}
                        <SupportFormField label="Select Issue Category" required>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setCategory(cat.value)}
                                        className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                                            category === cat.value
                                                ? "border-orange-500/50 bg-orange-500/10 text-white"
                                                : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                                        }`}
                                    >
                                        <span className="text-xl shrink-0">{cat.emoji}</span>
                                        <div>
                                            <p className="text-xs font-bold text-white">{cat.label}</p>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">{cat.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </SupportFormField>

                        {/* Subject */}
                        <SupportFormField label="Subject" required hint="Short summary of the issue">
                            <SupportInput
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. WebSocket disconnects when switching tabs"
                                required
                            />
                        </SupportFormField>

                        {/* Conditional Inputs */}
                        {category === "account" && (
                            <SupportFormField label="Reported Username" hint="Optional username involved">
                                <SupportInput
                                    value={reportedUsername}
                                    onChange={(e) => setReportedUsername(e.target.value)}
                                    placeholder="@username"
                                />
                            </SupportFormField>
                        )}

                        {category === "post" && (
                            <SupportFormField label="Post ID / URL" hint="ID or link to the post">
                                <SupportInput
                                    value={reportedPostId}
                                    onChange={(e) => setReportedPostId(e.target.value)}
                                    placeholder="e.g. post-uuid-1234"
                                />
                            </SupportFormField>
                        )}

                        {/* Description */}
                        <SupportFormField
                            label="Detailed Description"
                            required
                            hint="What happened? Steps to reproduce?"
                        >
                            <SupportTextarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Please describe what occurred, expected outcome, and steps to reproduce..."
                                rows={5}
                                required
                            />
                        </SupportFormField>

                        {/* Auto Captured Diagnostics */}
                        <SupportFormField label="System & Device Telemetry">
                            <SupportDeviceBox deviceInfo={deviceInfo} />
                        </SupportFormField>

                        {/* Attachment Support UI */}
                        <SupportFormField label="Attachments (Optional)" hint="Screenshots or logs">
                            <SupportFileUpload
                                onFilesSelected={(files) => setAttachedFiles(files)}
                                maxFiles={3}
                            />
                        </SupportFormField>

                        {error && <SupportErrorState message={error} />}

                        <Button type="submit" isLoading={loading} disabled={loading} className="w-full py-3.5">
                            Submit Problem Ticket
                        </Button>
                    </form>
                </SupportCard>
            )}
        </SupportLayout>
    );
}
