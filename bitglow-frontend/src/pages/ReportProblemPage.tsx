import { FormEvent, useEffect, useState } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
import {
    SupportFormField,
    SupportInput,
    SupportTextarea,
    SupportFileUpload,
    SupportDeviceBox,
    SupportSelect,
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
    const [deviceInfo, setDeviceInfo] = useState<TicketDeviceInfo>(() => supportService.getDeviceInfo());
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);

    const handleSubmit = async (e: FormEvent) => {
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
            {submittedTicket ? (
                <SupportSuccessTicketScreen ticket={submittedTicket} onReset={handleReset} />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <SupportFormField label="Category" required>
                        <SupportSelect
                            value={category}
                            onChange={(e) => setCategory(e.target.value as TicketCategory)}
                        >
                            <option value="bug">App Bug / Error</option>
                            <option value="account">Account / Security</option>
                            <option value="post">Post / Content</option>
                            <option value="general">Performance / Other</option>
                        </SupportSelect>
                    </SupportFormField>

                    <SupportFormField label="Subject" required>
                        <SupportInput
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Short summary of the issue"
                            required
                        />
                    </SupportFormField>

                    {category === "account" && (
                        <SupportFormField label="Reported Username">
                            <SupportInput
                                value={reportedUsername}
                                onChange={(e) => setReportedUsername(e.target.value)}
                                placeholder="@username"
                            />
                        </SupportFormField>
                    )}

                    {category === "post" && (
                        <SupportFormField label="Post ID / URL">
                            <SupportInput
                                value={reportedPostId}
                                onChange={(e) => setReportedPostId(e.target.value)}
                                placeholder="e.g. post-uuid-1234"
                            />
                        </SupportFormField>
                    )}

                    <SupportFormField label="Description" required>
                        <SupportTextarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What happened? Steps to reproduce?"
                            rows={5}
                            required
                        />
                    </SupportFormField>

                    <SupportFormField label="Device Info">
                        <SupportDeviceBox deviceInfo={deviceInfo} />
                    </SupportFormField>

                    <SupportFormField label="Attachments (Optional)">
                        <SupportFileUpload onFilesSelected={(files) => setAttachedFiles(files)} maxFiles={3} />
                    </SupportFormField>

                    {error && <SupportErrorState message={error} />}

                    <Button type="submit" isLoading={loading} disabled={loading} className="w-full py-3.5">
                        Submit Report
                    </Button>
                </form>
            )}
        </SupportLayout>
    );
}
