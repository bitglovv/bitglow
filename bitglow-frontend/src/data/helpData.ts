import { FAQCategory, FAQItem } from "../types/support";

export const FAQ_CATEGORIES: FAQCategory[] = [
    {
        id: "account-security",
        title: "Account & Security",
        description: "Password reset, email verification, 2FA, session revocation, and profile settings.",
        iconName: "Shield",
        color: "emerald",
    },
    {
        id: "messaging-calls",
        title: "Messaging & Live Spaces",
        description: "Direct messages, group chats, Live Room audio/video streaming, and attachments.",
        iconName: "MessageCircle",
        color: "blue",
    },
    {
        id: "feed-posts",
        title: "Feed & Content",
        description: "Creating posts, media uploads, editing posts, comments, likes, and saving content.",
        iconName: "FileText",
        color: "purple",
    },
    {
        id: "privacy-safety",
        title: "Privacy & Moderation",
        description: "Private account mode, online status visibility, blocking users, muting, and reporting.",
        iconName: "Lock",
        color: "orange",
    },
    {
        id: "troubleshooting",
        title: "Troubleshooting",
        description: "Connection issues, WebSocket reconnects, media loading, and app performance.",
        iconName: "Zap",
        color: "yellow",
    },
];

export const FAQ_ITEMS: FAQItem[] = [
    // Account & Security
    {
        id: "faq-1",
        slug: "how-to-reset-password",
        categoryId: "account-security",
        question: "How do I reset my password if I forgot it?",
        answer: "Click 'Forgot Password?' on the Login screen, enter your registered email, and submit. You will receive a reset link valid for 15–30 minutes. Follow the email link to choose a new password. Once reset, all active sessions on other devices will automatically be logged out for security.",
        tags: ["password", "forgot", "security", "login", "auth"],
        isPopular: true,
        updatedAt: "2025-06-01",
    },
    {
        id: "faq-2",
        slug: "how-to-change-email",
        categoryId: "account-security",
        question: "How do I change my registered email address?",
        answer: "Go to Settings > Change Email. Enter your current password and your new email address. A verification email will be sent exclusively to your new email. Your current email remains active until you click the verification link sent to the new address.",
        tags: ["email", "change email", "verification", "settings"],
        isPopular: true,
        updatedAt: "2025-06-05",
    },
    {
        id: "faq-3",
        slug: "logout-other-devices",
        categoryId: "account-security",
        question: "Can I log out of BitGlow on all other devices?",
        answer: "Yes! Changing your password from Settings > Security automatically revokes all other active sessions across mobile and desktop devices except your current active session.",
        tags: ["security", "logout", "sessions", "devices"],
        isPopular: false,
        updatedAt: "2025-06-02",
    },

    // Messaging & Live Spaces
    {
        id: "faq-4",
        slug: "who-can-message-me",
        categoryId: "messaging-calls",
        question: "Who can send me direct messages (DMs)?",
        answer: "If your account is public, anyone can send you a message. If your account is set to Private, messages from non-friends will arrive in your 'Message Requests' tab. You must Accept the message request before the conversation moves to your main chat list.",
        tags: ["dm", "messages", "privacy", "message request"],
        isPopular: true,
        updatedAt: "2025-06-10",
    },
    {
        id: "faq-5",
        slug: "live-space-access",
        categoryId: "messaging-calls",
        question: "Who can join or host Live Spaces?",
        answer: "Live Spaces allow users to host real-time audio and chat sessions. By default, mutual friends can access private Live Spaces, while public spaces are accessible to all followers.",
        tags: ["live", "space", "audio", "video", "friends"],
        isPopular: true,
        updatedAt: "2025-06-12",
    },

    // Feed & Content
    {
        id: "faq-6",
        slug: "save-posts",
        categoryId: "feed-posts",
        question: "How do I save posts to view later?",
        answer: "Tap the bookmark icon on any post in your feed. Saved posts can be accessed anytime from Settings > Saved Posts.",
        tags: ["save", "bookmarks", "posts", "feed"],
        isPopular: false,
        isRecent: true,
        updatedAt: "2025-06-14",
    },

    // Privacy & Moderation
    {
        id: "faq-7",
        slug: "private-account-mode",
        categoryId: "privacy-safety",
        question: "What happens when I turn on Private Account mode?",
        answer: "When Private Account mode is enabled from Settings > Privacy, only approved followers can see your profile details, follower counts, and posts. New follow requests must be manually accepted by you.",
        tags: ["private", "account", "privacy", "followers", "requests"],
        isPopular: true,
        updatedAt: "2025-06-15",
    },
    {
        id: "faq-8",
        slug: "hide-online-status",
        categoryId: "privacy-safety",
        question: "How do I hide my online status?",
        answer: "Go to Settings > Privacy and toggle off 'Online Status'. When disabled, other users will not see green online badges or activity indicators next to your profile.",
        tags: ["online", "status", "presence", "privacy"],
        isPopular: false,
        isRecent: true,
        updatedAt: "2025-06-15",
    },
    {
        id: "faq-9",
        slug: "blocking-vs-muting",
        categoryId: "privacy-safety",
        question: "What is the difference between Blocking and Muting?",
        answer: "Muting a user silently hides their posts, messages, and notifications from your view without notifying them or breaking mutual follow status. Blocking completely cuts off interaction: blocked users cannot view your profile, send messages, follow you, or join your Live Spaces.",
        tags: ["block", "mute", "safety", "moderation", "privacy"],
        isPopular: true,
        updatedAt: "2025-06-15",
    },

    // Troubleshooting
    {
        id: "faq-10",
        slug: "websocket-reconnect",
        categoryId: "troubleshooting",
        question: "Why am I seeing 'Reconnecting...' in messaging or Live Spaces?",
        answer: "BitGlow uses WebSockets for instant message delivery and real-time presence. If your internet connection switches between Wi-Fi and mobile data or experiences packet loss, BitGlow will automatically attempt to reconnect within seconds.",
        tags: ["reconnect", "websocket", "connection", "offline", "bug"],
        isPopular: false,
        isRecent: true,
        updatedAt: "2025-06-16",
    },
];
