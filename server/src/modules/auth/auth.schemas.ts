import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(255).optional(),
  organizationName: z.string().trim().min(2).max(255).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const switchOrganizationSchema = z.object({
  organizationId: z.string().uuid()
});

export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1).max(512)
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email()
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const googleStartQuerySchema = z.object({
  redirectTo: z.string().trim().min(1).max(2048).optional()
});

export const googleCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).max(2048),
  state: z.string().trim().min(1).max(2048)
});
