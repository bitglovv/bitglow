import { FormEvent, useEffect, useState } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
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

    const handleSubmit = async (e: FormEvent) => {
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
            {submittedTicket ? (
                <SupportSuccessTicketScreen ticket={submittedTicket} onReset={handleReset} />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SupportFormField label="Your Full Name" required>
                            <SupportInput
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Alex Mercer"
                                required
                            />
                        </SupportFormField>

                        <SupportFormField label="Email Address" required>
                            <SupportInput
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </SupportFormField>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <SupportFormField label="Category" required>
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

                        <SupportFormField label="Priority">
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

                    <SupportFormField label="Message" required>
                        <SupportTextarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here..."
                            rows={5}
                            required
                        />
                    </SupportFormField>

                    {error && <SupportErrorState message={error} />}

                    <Button type="submit" isLoading={loading} disabled={loading} className="w-full py-3.5">
                        Send Message
                    </Button>
                </form>
            )}
        </SupportLayout>
    );
}
