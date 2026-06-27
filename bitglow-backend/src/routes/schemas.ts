export const authSignupSchema = {
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
} as const;

export const authLoginSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["identifier", "password"],
        properties: {
            identifier: { type: "string", minLength: 3, maxLength: 255 },
            password: { type: "string", minLength: 1, maxLength: 128 },
        },
    },
} as const;

export const logoutSchema = {
    headers: {
        type: "object",
        required: ["authorization"],
        properties: {
            authorization: { type: "string", minLength: 8 },
        },
    },
} as const;

export const userUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        properties: {
            displayName: { type: "string", minLength: 1, maxLength: 64 },
            bio: { type: "string", maxLength: 500 },
            avatarUrl: { type: "string", maxLength: 2048 },
            website: { type: "string", maxLength: 2048 },
            location: { type: "string", maxLength: 80 },
            username: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
} as const;

export const deleteAccountSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["identifier", "password"],
        properties: {
            identifier: { type: "string", minLength: 3, maxLength: 255 },
            password: { type: "string", minLength: 1, maxLength: 128 },
        },
    },
} as const;

export const usernameCheckSchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        required: ["u"],
        properties: {
            u: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
} as const;

export const followSchema = {
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
} as const;

export const idParamSchema = {
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
} as const;

export const profileUsernameSchema = {
    params: {
        type: "object",
        required: ["username"],
        properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
        },
    },
} as const;

export const createPostSchema = {
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
} as const;

export const feedQuerySchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
            limit: { type: "string", pattern: "^[0-9]{1,3}$" },
            offset: { type: "string", pattern: "^[0-9]{1,6}$" },
        },
    },
} as const;

export const postCommentSchema = {
    ...idParamSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: {
            content: { type: "string", minLength: 1, maxLength: 1000 },
        },
    },
} as const;

export const updatePostSchema = {
    ...idParamSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: {
            content: { type: "string", minLength: 1, maxLength: 5000 },
            title: { type: "string", minLength: 1, maxLength: 140 },
        },
    },
} as const;

export const dmUserSchema = {
    params: {
        type: "object",
        required: ["userId"],
        properties: {
            userId: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
} as const;

export const dmSendSchema = {
    ...dmUserSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: {
            text: { type: "string", minLength: 1, maxLength: 2000 },
            type: { type: "string", enum: ["text", "post", "profile"] },
            postId: { type: "string" },
            profileId: { type: "string" },
            clientMsgId: { type: "string" },
        },
    },
} as const;

export const dmMessageSchema = {
    params: {
        type: "object",
        required: ["userId", "messageId"],
        properties: {
            userId: { type: "string", minLength: 1, maxLength: 64 },
            messageId: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
} as const;

export const dmEditSchema = {
    ...dmMessageSchema,
    body: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: {
            text: { type: "string", minLength: 1, maxLength: 2000 },
        },
    },
} as const;

export const liveCreateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        properties: {
            ownerId: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
} as const;

