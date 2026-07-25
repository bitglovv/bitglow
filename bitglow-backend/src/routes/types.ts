import { FromSchema } from "fastify-json-schema-remover";
import {
  authLoginSchema,
  authSignupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  verifyEmailSchema,
  restoreAccountSchema,
  sendRestorationOtpSchema,
} from "./schemas";

export type AuthSignup = FromSchema<typeof authSignupSchema.body>;
export type AuthLogin = FromSchema<typeof authLoginSchema.body>;
export type ForgotPassword = FromSchema<typeof forgotPasswordSchema.body>;
export type ResetPassword = FromSchema<typeof resetPasswordSchema.body>;
export type ResendVerification = FromSchema<
  typeof resendVerificationSchema.body
>;
export type VerifyEmail = FromSchema<typeof verifyEmailSchema.querystring>;
export type RestoreAccount = FromSchema<typeof restoreAccountSchema.body>;
export type SendRestorationOtp = FromSchema<
  typeof sendRestorationOtpSchema.body
>;