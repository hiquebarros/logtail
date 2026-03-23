"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSourceSchema = exports.createSourceSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
exports.createSourceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(255),
    language: zod_1.z.nativeEnum(client_1.ApplicationLanguage)
});
exports.updateSourceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(255)
});
