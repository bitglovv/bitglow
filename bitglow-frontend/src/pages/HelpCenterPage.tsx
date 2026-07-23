import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    HelpCircle,
    Shield,
    MessageCircle,
    FileText,
    Lock,
    Zap,
    ArrowRight,
    Star,
    Mail,
    AlertTriangle,
} from "lucide-react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportHero } from "../components/support/SupportHero";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SupportCard } from "../components/support/SupportCard";
import { SupportEmptyState, SupportLoadingState } from "../components/support/SupportStates";
import { supportService } from "../services/supportService";
import { FAQCategory, FAQItem } from "../types/support";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function HelpCenterPage() {
    useEffect(() => {
        document.title = `Help Center & Knowledge Base · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const [categories, setCategories] = useState<FAQCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [popularFaqs, setPopularFaqs] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const iconMap: Record<string, React.ReactNode> = {
        Shield: <Shield className="h-4.5 w-4.5 text-emerald-400" />,
        MessageCircle: <MessageCircle className="h-4.5 w-4.5 text-blue-400" />,
        FileText: <FileText className="h-4.5 w-4.5 text-purple-400" />,
        Lock: <Lock className="h-4.5 w-4.5 text-orange-400" />,
        Zap: <Zap className="h-4.5 w-4.5 text-yellow-400" />,
    };

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [cats, items, popular] = await Promise.all([
                    supportService.getCategories(),
                    supportService.getFAQs(selectedCategory, searchQuery),
                    supportService.getPopularFAQs(),
                ]);

                setCategories(cats);
                setFaqs(items);
                setPopularFaqs(popular);
            } catch (err) {
                console.error("Failed to load FAQs:", err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [selectedCategory, searchQuery]);

    const accordionItems = faqs.map((faq) => ({
        id: faq.id,
        title: faq.question,
        badge: faq.isPopular ? "Popular" : undefined,
        content: (
            <div className="space-y-3">
                <p>{faq.answer}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {faq.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
        ),
    }));

    return (
        <SupportLayout title="Help Center">
            {/* Knowledge Base Hero with Search Bar */}
            <SupportHero
                badge="Knowledge Base & FAQs"
                badgeColor="blue"
                title="How can we help you?"
                description="Search instant answers, troubleshooting steps, and guides for account settings, messaging, Live Spaces, and security."
                icon={<HelpCircle className="h-8 w-8 text-blue-400" />}
            >
                <div className="relative w-full mt-2">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for answers, e.g. 'reset password', 'private account', 'WebSocket'..."
                        className="w-full rounded-2xl border border-white/15 bg-black/60 pl-12 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-white"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </SupportHero>

            {/* FAQ Category Selection Cards */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Browse by Category
                    </p>
                    {selectedCategory !== "all" && (
                        <button
                            type="button"
                            onClick={() => setSelectedCategory("all")}
                            className="text-xs font-semibold text-blue-400 hover:underline"
                        >
                            Show All Categories
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                            selectedCategory === "all"
                                ? "border-blue-500/50 bg-blue-500/10 text-white font-bold"
                                : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                    >
                        <HelpCircle className="h-5 w-5 mb-1 text-blue-400" />
                        <span className="text-xs">All FAQs</span>
                    </button>

                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                                selectedCategory === cat.id
                                    ? "border-blue-500/50 bg-blue-500/10 text-white font-bold"
                                    : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                            }`}
                        >
                            <div className="mb-1">{iconMap[cat.iconName] || <HelpCircle className="h-5 w-5" />}</div>
                            <span className="text-xs line-clamp-1">{cat.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Popular Articles Grid (if not filtering) */}
            {!searchQuery && selectedCategory === "all" && popularFaqs.length > 0 && (
                <SupportCard
                    title="Popular Articles"
                    subtitle="Most frequently accessed help guides"
                    icon={<Star className="h-4.5 w-4.5 text-yellow-400 fill-yellow-400/20" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {popularFaqs.slice(0, 4).map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSearchQuery(item.question)}
                                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.05] hover:text-white transition cursor-pointer"
                            >
                                <span className="truncate">{item.question}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-2" />
                            </div>
                        ))}
                    </div>
                </SupportCard>
            )}

            {/* Knowledge Base Results */}
            <div>
                <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {searchQuery ? `Search Results for "${searchQuery}"` : "Knowledge Base Articles"}
                </p>

                {loading ? (
                    <SupportLoadingState message="Searching knowledge base..." />
                ) : faqs.length === 0 ? (
                    <SupportEmptyState
                        onReset={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                        }}
                    />
                ) : (
                    <SupportAccordion items={accordionItems} allowMultiple={false} />
                )}
            </div>

            {/* "Still Need Help?" CTA */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 text-center sm:flex sm:items-center sm:justify-between sm:text-left gap-4">
                <div>
                    <h3 className="text-base font-bold text-white">Still need assistance?</h3>
                    <p className="mt-0.5 text-xs text-zinc-400">
                        Can't find what you're looking for? Reach out directly to support or submit a problem report.
                    </p>
                </div>

                <div className="mt-4 sm:mt-0 flex flex-wrap items-center justify-center gap-2 shrink-0">
                    <Link
                        to="/contact"
                        className="flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-2.5 text-xs font-bold text-blue-300 hover:bg-blue-500/30 hover:text-white transition"
                    >
                        <Mail className="h-4 w-4" />
                        <span>Contact Support</span>
                    </Link>
                    <Link
                        to="/report"
                        className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition"
                    >
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <span>Report Problem</span>
                    </Link>
                </div>
            </div>
        </SupportLayout>
    );
}
