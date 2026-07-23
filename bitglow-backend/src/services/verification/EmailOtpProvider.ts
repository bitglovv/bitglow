import { VerificationProvider, VerificationMethod, HighRiskActionType } from "./verificationTypes";
import { sendActionVerificationOtpEmail } from "../email";

export class EmailOtpProvider implements VerificationProvider {
    readonly method: VerificationMethod = 'email';

    async sendChallenge(
        userId: string,
        email: string,
        username: string,
        code: string,
        action: HighRiskActionType
    ): Promise<void> {
        await sendActionVerificationOtpEmail(email, username, code, action);
    }
}
