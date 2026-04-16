"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = exports.users = void 0;
// In-memory store shared across routes
exports.users = [
    {
        id: "u_1",
        username: "johndoe",
        displayName: "John Doe",
        email: "john@example.com",
        password: "password123",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
        bio: "Digital explorer and code crafter.",
        location: "San Francisco",
        followersCount: 120,
        followsCount: 80,
    },
    {
        id: "u_2",
        username: "janedoe",
        displayName: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
        bio: "Navigating the bitstream.",
        location: "London",
        followersCount: 500,
        followsCount: 200,
    },
    {
        id: "u_3",
        username: "bitglow",
        displayName: "BitGlow Official",
        email: "official@bitglow.com",
        password: "password123",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=BitGlow",
        bio: "The future of live sync.",
        location: "The Cloud",
        followersCount: 10000,
        followsCount: 1,
    }
];
exports.JWT_SECRET = "bitglow-secret-key-change-me";
