import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import Header from "../components/common/Header";
import { useAuth } from "../hooks/useAuth";
import { api, Identity, IdentityAttribute } from "../services/api";

const attributeLabelMap: Record<string, string> = {
    bitglow_account: "BitGlow Account",
    email_verified: "Email Verified",
    student: "Student",
    college_member: "College Member",
};

const verificationLabelMap: Record<string, string> = {
    verified: "Verified",
    not_verified: "Not yet verified",
    pending: "Pending verification",
    revoked: "Revoked",
};

function formatAttributeName(attributeType: string) {
    return attributeLabelMap[attributeType] || attributeType.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseAttributeValue(attribute: IdentityAttribute) {
    if (attribute.attributeValue === "true") return "Yes";
    if (attribute.attributeValue === "false") return "No";
    if (attribute.attributeValue === "not_set") return "Not set";
    return attribute.attributeValue;
}

export default function IdentityPage() {
    const { user } = useAuth();
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.title = "BitGlow Identity";
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function loadIdentity() {
            setLoading(true);
            setError(null);

            try {
                const current = await api.identity.getCurrent();
                if (isMounted) {
                    setIdentity(current);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Unable to load identity");
                    setIdentity(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        void loadIdentity();

        return () => {
            isMounted = false;
        };
    }, [user?.id]);

    const attributes = useMemo(() => identity?.attributes ?? [], [identity]);

    if (!user) {
        return (
            <div className="flex h-screen flex-col bg-black text-white">
                <Header showTop={false} hideBottomNav />
                <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-10 text-center">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-zinc-300">
                        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-400" />
                        <h1 className="text-2xl font-black text-white">Sign in to view your identity</h1>
                        <p className="mt-3 text-sm text-zinc-400">Your BitGlow identity is only available to authenticated users.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-black text-white selection:bg-brand/30">
            <Header showTop={false} hideBottomNav />
            <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,16px))] custom-scrollbar sm:px-6 sm:pb-6">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-6">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">BitGlow Identity</p>
                                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Your BitGlow Identity</h1>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {identity?.status === "active" ? "Active" : "Ready"}
                            </div>
                        </div>

                        {loading ? (
                            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-300">
                                <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
                                Loading identity details...
                            </div>
                        ) : error ? (
                            <div className="mt-7 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
                                {error}
                            </div>
                        ) : (
                            <>
                                <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Identity Status</p>
                                            <p className="mt-2 text-lg font-semibold text-white">{identity?.status === "active" ? "✓ Active" : "Pending"}</p>
                                        </div>
                                        <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                                    </div>
                                </div>

                                <div className="mt-7">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Identity Attributes</p>
                                    {attributes.length === 0 ? (
                                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-zinc-400">
                                            No attributes have been recorded yet for this identity.
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-3">
                                            {attributes.map((attribute) => (
                                                <div key={attribute.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <div className="text-sm font-semibold text-white">{formatAttributeName(attribute.attributeType)}</div>
                                                            <div className="mt-1 text-xs text-zinc-400">
                                                                {parseAttributeValue(attribute)}
                                                            </div>
                                                        </div>
                                                        <div className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                                                            {verificationLabelMap[attribute.verificationStatus] ?? attribute.verificationStatus}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm text-zinc-300">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="mt-0.5 h-4 w-4 text-brand" />
                                        <span>
                                            Your identity is designed to minimize unnecessary information sharing. Attributes are tracked separately from verification and credential issuance.
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
