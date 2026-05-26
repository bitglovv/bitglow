import { useEffect, useState } from "react";
import { LegalLayout } from "../components/landing/LegalLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";

export default function ContactPage() {
    useEffect(() => { document.title = "Contact Support - BitGlow"; }, []);

    const [type, setType] = useState("general");
    const [reason, setReason] = useState("");
    const [reportedUserId, setReportedUserId] = useState("");
    const [postId, setPostId] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            await api.settings.reportProblem(type, reason, reportedUserId, postId);
            setSuccess(true);
            setReason("");
            setReportedUserId("");
            setPostId("");
        } catch (err: any) {
            setError(err.message || "Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LegalLayout
            title="Contact & Support"
            description="If you need help with your account, have product questions, or want to report a problem, use the form below or reach out directly."
        >
            <section className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4">Direct Email</h2>
                <p className="mt-2 text-zinc-300">
                    Reach us at{" "}
                    <a className="text-white font-semibold underline underline-offset-4 hover:text-brand transition" href="mailto:support@bitglow.app">
                        support@bitglow.app
                    </a>
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-white mb-4">Report a Problem</h2>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                    {success ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-center font-medium">
                            Your report has been submitted successfully. We will review it shortly.
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">What is this regarding?</label>
                                <select 
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-[15px] text-white outline-none focus:border-brand"
                                    required
                                >
                                    <option value="general">General Support</option>
                                    <option value="account">Report an Account</option>
                                    <option value="post">Report a Post</option>
                                    <option value="bug">Report a Bug</option>
                                </select>
                            </div>

                            {type === "account" && (
                                <Input 
                                    label="Username or User ID to Report" 
                                    value={reportedUserId} 
                                    onChange={(e) => setReportedUserId(e.target.value)} 
                                    required 
                                />
                            )}

                            {type === "post" && (
                                <Input 
                                    label="Post ID" 
                                    value={postId} 
                                    onChange={(e) => setPostId(e.target.value)} 
                                    required 
                                />
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Description</label>
                                <textarea 
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-[15px] text-white outline-none focus:border-brand min-h-[100px] resize-y"
                                    placeholder="Please provide details about the issue..."
                                    required
                                />
                            </div>

                            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                            <div className="pt-2">
                                <Button type="submit" isLoading={loading} disabled={loading} className="w-full">
                                    Submit Report
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </section>
        </LegalLayout>
    );
}
