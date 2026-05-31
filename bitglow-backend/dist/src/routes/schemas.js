"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveCreateSchema = exports.dmSendSchema = exports.dmUserSchema = exports.updatePostSchema = exports.postCommentSchema = exports.feedQuerySchema = exports.createPostSchema = exports.profileUsernameSchema = exports.idParamSchema = exports.followSchema = exports.usernameCheckSchema = exports.deleteAccountSchema = exports.userUpdateSchema = exports.logoutSchema = exports.authLoginSchema = exports.authSignupSchema = void 0;
exports.authSignupSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["username", "email", "password"],
        properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
            displayName: { type: "string", minLength: 1, maxLength: 64 },
            email: { type: "string", minLength: 3, maxLength: 255 },
            password: { type: "string", minLength: 8, maxLength: 128 },
        },
    },
};
exports.authLoginSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["identifier", "password"],
        properties: {
            identifier: { type: "string", minLength: 3, maxLength: 255 },
            password: { type: "string", minLength: 1, maxLength: 128 },
        },
    },
};
exports.logoutSchema = {
    headers: {
        type: "object",
        required: ["authorization"],
        properties: {
            authorization: { type: "string", minLength: 8 },
        },
    },
};
exports.userUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        properties: {
            displayName: { type: "string", minLength: 1, maxLength: 64 },
            bio: { type: "string", minLength: 1, maxLength: 500 },
            avatarUrl: { type: "string", maxLength: 2048 },
            website: { type: "string", maxLength: 2048 },
            location: { type: "string", minLength: 1, maxLength: 80 },
            username: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
};
exports.deleteAccountSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["identifier", "password"],
        properties: {
            identifier: { type: "string", minLength: 3, maxLength: 255 },
            password: { type: "string", minLength: 1, maxLength: 128 },
        },
    },
};
exports.usernameCheckSchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        required: ["u"],
        properties: {
            u: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
};
exports.followSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
    body: {
        type: "object",
        additionalProperties: false,
        properties: {
            friendId: { type: "string", minLength: 1, maxLength: 64 },
            username: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
};
exports.idParamSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
};
exports.profileUsernameSchema = {
    params: {
        type: "object",
        required: ["username"],
        properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
};
exports.createPostSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: {
            content: { type: "string", minLength: 1, maxLength: 5000 },
            title: { type: "string", minLength: 1, maxLength: 140 },
            visibility: { type: "string", enum: ["public", "friends"] },
        },
    },
};
exports.feedQuerySchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
            limit: { type: "string", pattern: "^[0-9]{1,3}$" },
            offset: { type: "string", pattern: "^[0-9]{1,6}$" },
        },
    },
};
exports.postCommentSchema = {
    ...exports.idParamSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: {
            content: { type: "string", minLength: 1, maxLength: 1000 },
        },
    },
};
exports.updatePostSchema = {
    ...exports.idParamSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: {
            content: { type: "string", minLength: 1, maxLength: 5000 },
            title: { type: "string", minLength: 1, maxLength: 140 },
        },
    },
};
exports.dmUserSchema = {
    params: {
        type: "object",
        required: ["userId"],
        properties: {
            userId: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
};
exports.dmSendSchema = {
    ...exports.dmUserSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: {
            text: { type: "string", minLength: 1, maxLength: 2000 },
            type: { type: "string", enum: ["text", "post", "profile"] },
            postId: { type: "string" },
            profileId: { type: "string" },
        },
    },
};
exports.liveCreateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        properties: {
            ownerId: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
};
