export type VerificationMethod = 'email' | 'totp' | 'passkey' | 'webauthn';

export type HighRiskActionType =
    | 'delete_account'
    | 'restore_account'
    | 'change_email'
    | 'change_password'
    | 'disable_2fa'
    | 'export_data';

export interface ActionVerificationRecord {
    id: string;
    userId: string;
    verificationType: HighRiskActionType;
    method: VerificationMethod;
    otpHash: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    usedAt: Date | null;
    createdAt: Date;
}

export interface VerificationProvider {
    readonly method: VerificationMethod;
    sendChallenge(
        userId: string,
        email: string,
        username: string,
        code: string,
        action: HighRiskActionType
    ): Promise<void>;
    verifyChallenge?(userId: string, input: string): Promise<boolean>;
}

export interface VerificationResult {
    success: boolean;
    reason?: 'EXPIRED' | 'MAX_ATTEMPTS_EXCEEDED' | 'INVALID_CODE' | 'ALREADY_USED' | 'NOT_FOUND' | 'RATE_LIMITED';
    message: string;
    attemptsLeft?: number;
}
