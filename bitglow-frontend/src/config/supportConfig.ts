/* Centralized configuration for BitGlow Support, Metadata & Legal Hub */

export const SUPPORT_CONFIG = {
    appName: "BitGlow",
    appVersion: "1.0.0",
    releaseDate: "June 2025",
    buildNumber: "2025.06.15-prod",
    environment: "Production",

    contacts: {
        supportEmail: "support@bitglow.app",
        privacyEmail: "privacy@bitglow.app",
        securityEmail: "security@bitglow.app",
        pressEmail: "press@bitglow.app",
        legalEmail: "legal@bitglow.app",
    },

    sla: {
        generalResponseTime: "Within 24 hours",
        privacyResponseTime: "Within 2 business days",
        securityResponseTime: "Expedited (within 4 hours)",
        businessResponseTime: "Within 48 hours",
    },

    dates: {
        termsLastUpdated: "June 2025",
        privacyLastUpdated: "June 2025",
        communityGuidelinesUpdated: "June 2025",
    },

    systemStatus: {
        status: "operational" as "operational" | "degraded" | "outage" | "maintenance",
        label: "All Systems Operational",
        uptimePercentage: "99.98%",
        lastIncident: "None reported in past 90 days",
        services: [
            { name: "Authentication & User API", status: "operational" },
            { name: "Real-time Messaging (WebSockets)", status: "operational" },
            { name: "Live Rooms & Audio/Video", status: "operational" },
            { name: "Feed & Post Engine", status: "operational" },
            { name: "Database & Storage", status: "operational" },
        ],
    },

    social: {
        twitter: "https://twitter.com/bitglowapp",
        github: "https://github.com/bitglow",
        discord: "https://discord.gg/bitglow",
    },

    features: [
        {
            iconName: "MessageCircle",
            title: "Real-time Messaging",
            desc: "Instant direct messages, group chats, and typing indicators powered by WebSockets.",
            category: "Core Messaging",
        },
        {
            iconName: "Users",
            title: "Social Network",
            desc: "Follow friends, share media posts, like, comment, and engage with community feeds.",
            category: "Community",
        },
        {
            iconName: "Video",
            title: "Live Spaces",
            desc: "Join or host live interactive audio/video rooms with low-latency streaming.",
            category: "Real-time Media",
        },
        {
            iconName: "Shield",
            title: "Privacy First",
            desc: "Private account mode, online status controls, block/mute tools, and granular settings.",
            category: "Security",
        },
        {
            iconName: "Cpu",
            title: "Modern Engineering",
            desc: "Architected with React, TypeScript, Node.js, Fastify, PostgreSQL, and Vite.",
            category: "Infrastructure",
        },
        {
            iconName: "Zap",
            title: "Lightning Fast",
            desc: "Optimized frontend bundles and lean REST/WS endpoints for sub-100ms response times.",
            category: "Performance",
        },
    ],

    techStack: [
        "React 18",
        "TypeScript",
        "Vite",
        "Fastify",
        "Node.js",
        "PostgreSQL",
        "WebSockets",
        "Tailwind CSS",
        "JWT Auth",
        "Bcrypt Security",
    ],

    roadmap: [
        {
            version: "v1.1.0",
            target: "Q3 2025",
            title: "End-to-End Encrypted Direct Messages",
            status: "In Development",
        },
        {
            version: "v1.2.0",
            target: "Q4 2025",
            title: "Custom Emotes & Animated Reactions",
            status: "Planned",
        },
        {
            version: "v2.0.0",
            target: "Q1 2026",
            title: "Multi-party Video Conferences & Screen Sharing",
            status: "Planned",
        },
    ],
};
