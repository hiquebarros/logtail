import { ApplicationLanguage } from "@prisma/client";
import { z } from "zod";

export const createSourceSchema = z.object({
  name: z.string().trim().min(1).max(255),
  language: z.nativeEnum(ApplicationLanguage)
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const updateSourceSchema = z.object({
  name: z.string().trim().min(1).max(255)
});

export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
