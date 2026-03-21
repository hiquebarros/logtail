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
