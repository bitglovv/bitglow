export const authSignupSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["username", "email", "password"],
        properties: {
            username: { type: "string", minLength: 3, maxLength: 30 },
            displayName: { type: "string", minLength: 1, maxLength: 64 },
            email: { type: "string", format: "email", minLength: 3, maxLength: 255 },
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

export const forgotPasswordSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["email"],
        properties: {
            email: { type: "string", format: "email", maxLength: 255 },
        },
    },
} as const;

export const resetPasswordSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["token", "newPassword"],
        properties: {
            token: { type: "string", minLength: 1, maxLength: 255 },
            newPassword: { type: "string", minLength: 8, maxLength: 128 },
        },
    },
} as const;

export const resendVerificationSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["email"],
        properties: {
            email: { type: "string", format: "email", maxLength: 255 },
        },
    },
} as const;

export const verifyEmailSchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        required: ["token"],
        properties: {
            token: { type: "string", minLength: 1, maxLength: 255 },
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
        required: ["password"],
        properties: {
            password: { type: "string", minLength: 1, maxLength: 128 },
            confirmText: { type: "string", maxLength: 50 },
            reason: { type: "string", maxLength: 1000 },
            twoFactorCode: { type: "string", maxLength: 20 },
        },
    },
} as const;

export const restoreAccountSchema = {
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
            id: { type: "string", format: "uuid" },
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
            id: { type: "string", format: "uuid" },
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

export const refreshSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["refreshToken"],
        properties: {
            refreshToken: { type: "string", minLength: 32, maxLength: 512 },
        },
    },
} as const;

export const paginationSchema = {
    querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
            limit: { type: "string", pattern: "^[0-9]{1,3}$" },
            offset: { type: "string", pattern: "^[0-9]{1,9}$" },
        },
    },
} as const;

export const dmMessageSchema = {
    params: {
        type: "object",
        required: ["userId", "messageId"],
        properties: {
            userId: { type: "string", format: "uuid" },
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

export const dmForwardSchema = {
    params: {
        type: "object",
        required: ["userId", "messageId"],
        properties: {
            userId: { type: "string", minLength: 1, maxLength: 64 },
            messageId: { type: "string", minLength: 1, maxLength: 64 },
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

export const emailUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["currentPassword", "newEmail"],
        properties: {
            currentPassword: { type: "string", minLength: 1, maxLength: 128 },
            newEmail: { type: "string", format: "email", maxLength: 255 },
        },
    },
} as const;

export const passwordUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["currentPassword", "newPassword"],
        properties: {
            currentPassword: { type: "string", minLength: 1, maxLength: 128 },
            newPassword: { type: "string", minLength: 8, maxLength: 128 },
        },
    },
} as const;

export const privacyUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["isPrivate"],
        properties: {
            isPrivate: { type: "boolean" },
        },
    },
} as const;

export const onlineStatusUpdateSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["isVisible"],
        properties: {
            isVisible: { type: "boolean" },
        },
    },
} as const;

export const reportSchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["type", "reason"],
        properties: {
            type: { type: "string", enum: ["account", "post"] },
            reportedUserId: { type: "string", minLength: 1, maxLength: 64 },
            postId: { type: "string", minLength: 1, maxLength: 64 },
            reason: { type: "string", minLength: 1, maxLength: 1000 },
        },
    },
} as const;

