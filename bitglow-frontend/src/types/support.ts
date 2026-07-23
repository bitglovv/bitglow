/* Data models and interfaces for Support, Knowledge Base & Ticket Tracking */

export type TicketCategory =
    | "general"
    | "account"
    | "post"
    | "bug"
    | "privacy"
    | "security"
    | "business";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type TicketStatus = "open" | "in_progress" | "pending_user" | "resolved" | "closed";

export interface TicketDeviceInfo {
    os?: string;
    browser?: string;
    screenResolution?: string;
    deviceType?: string;
    userAgent?: string;
}

export interface TicketAttachment {
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url?: string;
}

export interface TicketReply {
    id: string;
    ticketId: string;
    sender: {
        id: string;
        name: string;
        avatarUrl?: string;
        isStaff: boolean;
    };
    message: string;
    createdAt: string;
    attachments?: TicketAttachment[];
}

export interface TicketTimelineEvent {
    id: string;
    title: string;
    description?: string;
    timestamp: string;
    actor?: string;
    status: TicketStatus;
}

export interface Ticket {
    id: string;
    referenceId: string; // e.g. #RPT-8F92A1 or #SUP-3B71E9
    category: TicketCategory;
    subject: string;
    description: string;
    priority: TicketPriority;
    status: TicketStatus;
    userEmail?: string;
    reportedUsername?: string;
    reportedPostId?: string;
    deviceInfo?: TicketDeviceInfo;
    attachments?: TicketAttachment[];
    replies?: TicketReply[];
    timeline?: TicketTimelineEvent[];
    createdAt: string;
    updatedAt: string;
}

export interface FAQItem {
    id: string;
    slug: string;
    categoryId: string;
    question: string;
    answer: string;
    tags: string[];
    isPopular?: boolean;
    isRecent?: boolean;
    updatedAt?: string;
}

export interface FAQCategory {
    id: string;
    title: string;
    description: string;
    iconName: string;
    color: string;
    articleCount?: number;
}

export interface SystemServiceStatus {
    name: string;
    status: "operational" | "degraded" | "outage" | "maintenance";
    message?: string;
}

export interface ChangelogEntry {
    id: string;
    version: string;
    releaseDate: string;
    title: string;
    highlights: string[];
    breakingChanges?: string[];
    category: "feature" | "improvement" | "security" | "bugfix";
}
