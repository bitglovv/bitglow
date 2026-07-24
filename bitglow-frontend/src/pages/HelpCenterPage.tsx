import { useEffect, useState } from "react";
import { SupportLayout } from "../components/support/SupportLayout";
import { SupportAccordion } from "../components/support/SupportAccordion";
import { SupportEmptyState, SupportLoadingState } from "../components/support/SupportStates";
import { supportService } from "../services/supportService";
import { FAQCategory, FAQItem } from "../types/support";
import { SUPPORT_CONFIG } from "../config/supportConfig";

export default function HelpCenterPage() {
    useEffect(() => {
        document.title = `Help Center · ${SUPPORT_CONFIG.appName}`;
    }, []);

    const [categories, setCategories] = useState<FAQCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [faqs, setFaqs] = useState<FAQItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [cats, items] = await Promise.all([
                    supportService.getCategories(),
                    supportService.getFAQs(selectedCategory, searchQuery),
                ]);

                setCategories(cats);
                setFaqs(items);
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
        content: <p>{faq.answer}</p>,
    }));

    return (
        <SupportLayout title="Help Center">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help articles..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
            />

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        selectedCategory === "all"
                            ? "bg-white/10 text-white"
                            : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            selectedCategory === cat.id
                                ? "bg-white/10 text-white"
                                : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                    >
                        {cat.title}
                    </button>
                ))}
            </div>

            {loading ? (
                <SupportLoadingState message="Loading articles..." />
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
        </SupportLayout>
    );
}
