"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCallbackQuerySchema = exports.googleStartQuerySchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.switchOrganizationSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128)
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    name: zod_1.z.string().trim().min(1).max(255).optional(),
    organizationName: zod_1.z.string().trim().min(2).max(255).optional()
});
exports.switchOrganizationSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid()
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().trim().min(1).max(512)
});
exports.resendVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email()
});
exports.googleStartQuerySchema = zod_1.z.object({
    redirectTo: zod_1.z.string().trim().min(1).max(2048).optional()
});
exports.googleCallbackQuerySchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1).max(2048),
    state: zod_1.z.string().trim().min(1).max(2048)
});
