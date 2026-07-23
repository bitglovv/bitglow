import { FAQ_CATEGORIES, FAQ_ITEMS } from "../data/helpData";
import {
    FAQCategory,
    FAQItem,
    Ticket,
    TicketCategory,
    TicketDeviceInfo,
    TicketPriority,
} from "../types/support";
import { api } from "./api";

/**
 * Support & Knowledge Base Data Layer.
 * Provides abstracted methods so UI components don't depend directly on mock objects or static datasets.
 * In the future, these methods can easily call REST endpoints (e.g. GET /api/support/faqs) without UI changes.
 */
export const supportService = {
    /**
     * Get all FAQ categories.
     */
    getCategories: async (): Promise<FAQCategory[]> => {
        return Promise.resolve(FAQ_CATEGORIES);
    },

    /**
     * Get all FAQs or filter by category / search query.
     */
    getFAQs: async (categoryId?: string, query?: string): Promise<FAQItem[]> => {
        let items = FAQ_ITEMS;

        if (categoryId && categoryId !== "all") {
            items = items.filter((item) => item.categoryId === categoryId);
        }

        if (query && query.trim() !== "") {
            const q = query.toLowerCase().trim();
            items = items.filter(
                (item) =>
                    item.question.toLowerCase().includes(q) ||
                    item.answer.toLowerCase().includes(q) ||
                    item.tags.some((tag) => tag.toLowerCase().includes(q))
            );
        }

        return Promise.resolve(items);
    },

    /**
     * Get popular FAQs.
     */
    getPopularFAQs: async (): Promise<FAQItem[]> => {
        return Promise.resolve(FAQ_ITEMS.filter((item) => item.isPopular));
    },

    /**
     * Auto-detect client device and browser information for ticket diagnostics.
     */
    getDeviceInfo: (): TicketDeviceInfo => {
        if (typeof window === "undefined") {
            return {
                os: "Unknown",
                browser: "Unknown",
                screenResolution: "Unknown",
                deviceType: "Unknown",
            };
        }

        const userAgent = navigator.userAgent;
        let os = "Desktop / Web";
        if (/windows/i.test(userAgent)) os = "Windows";
        else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
        else if (/linux/i.test(userAgent)) os = "Linux";
        else if (/android/i.test(userAgent)) os = "Android";
        else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";

        let browser = "Web Browser";
        if (/chrome|crios/i.test(userAgent) && !/edg/i.test(userAgent)) browser = "Google Chrome";
        else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
        else if (/firefox|fxios/i.test(userAgent)) browser = "Mozilla Firefox";
        else if (/edg/i.test(userAgent)) browser = "Microsoft Edge";

        const screenResolution = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
        const deviceType = window.innerWidth <= 768 ? "Mobile" : "Desktop";

        return {
            os,
            browser,
            screenResolution,
            deviceType,
            userAgent,
        };
    },

    /**
     * Submit a Problem Report / Bug ticket.
     */
    submitProblemReport: async (payload: {
        category: TicketCategory;
        subject: string;
        description: string;
        reportedUsername?: string;
        reportedPostId?: string;
        deviceInfo?: TicketDeviceInfo;
        attachments?: Array<{ name: string; size: number }>;
    }): Promise<Ticket> => {
        // Generate reference ID e.g. #RPT-7A8B9C
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const referenceId = `#RPT-${randomHex}`;

        try {
            // Send to backend API
            await api.settings.reportProblem(
                payload.category,
                `Subject: ${payload.subject}\n\n${payload.description}`,
                payload.reportedUsername || "",
                payload.reportedPostId || ""
            );
        } catch (err) {
            console.warn("Backend report fallback active:", err);
        }

        const newTicket: Ticket = {
            id: `tkt-${Date.now()}`,
            referenceId,
            category: payload.category,
            subject: payload.subject,
            description: payload.description,
            priority: payload.category === "security" ? "urgent" : "normal",
            status: "open",
            reportedUsername: payload.reportedUsername,
            reportedPostId: payload.reportedPostId,
            deviceInfo: payload.deviceInfo || supportService.getDeviceInfo(),
            attachments: (payload.attachments || []).map((att, idx) => ({
                id: `att-${idx}`,
                fileName: att.name,
                fileSize: att.size,
                fileType: "image/png",
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        return Promise.resolve(newTicket);
    },

    /**
     * Submit a General Support Inquiry.
     */
    submitSupportContact: async (payload: {
        name: string;
        email: string;
        category: TicketCategory;
        priority: TicketPriority;
        subject: string;
        message: string;
    }): Promise<Ticket> => {
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const referenceId = `#SUP-${randomHex}`;

        try {
            await api.settings.reportProblem(
                payload.category,
                `[Contact Form from ${payload.name} (${payload.email})] Subject: ${payload.subject}\n\n${payload.message}`,
                "",
                ""
            );
        } catch (err) {
            console.warn("Backend support contact fallback active:", err);
        }

        const newTicket: Ticket = {
            id: `tkt-${Date.now()}`,
            referenceId,
            category: payload.category,
            subject: payload.subject,
            description: payload.message,
            priority: payload.priority,
            status: "open",
            userEmail: payload.email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        return Promise.resolve(newTicket);
    },
};
