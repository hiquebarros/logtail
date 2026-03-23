"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourcesService = exports.SourcesError = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const base62_1 = require("../../utils/base62");
const API_KEY_LENGTH = 28;
const MAX_API_KEY_RETRIES = 5;
class SourcesError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.SourcesError = SourcesError;
class SourcesService {
    async listSources(organizationId) {
        const sources = await client_2.prisma.application.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
        return {
            data: sources.map((source) => this.toSourceRecord(source))
        };
    }
    async getSourceById(organizationId, sourceId) {
        const source = await client_2.prisma.application.findFirst({
            where: {
                id: sourceId,
                organizationId
            }
        });
        if (!source) {
            throw new SourcesError("Source not found", 404);
        }
        return {
            data: this.toSourceRecord(source)
        };
    }
    async createSource(organizationId, input) {
        const normalizedName = input.name.trim();
        for (let attempt = 0; attempt < MAX_API_KEY_RETRIES; attempt += 1) {
            try {
                const created = await client_2.prisma.application.create({
                    data: {
                        organizationId,
                        name: normalizedName,
                        language: input.language,
                        apiKey: (0, base62_1.generateBase62Token)(API_KEY_LENGTH)
                    }
                });
                return {
                    data: this.toSourceRecord(created)
                };
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002") {
                    const target = this.getErrorTarget(error.meta?.target);
                    if (this.isNameCollision(target, error.message)) {
                        throw new SourcesError("A source with this name already exists", 409);
                    }
                    if (this.isApiKeyCollision(target, error.message)) {
                        continue;
                    }
                }
                throw error;
            }
        }
        throw new SourcesError("Could not generate a unique API key", 500);
    }
    async updateSource(organizationId, sourceId, input) {
        const existing = await client_2.prisma.application.findFirst({
            where: {
                id: sourceId,
                organizationId
            },
            select: {
                id: true
            }
        });
        if (!existing) {
            throw new SourcesError("Source not found", 404);
        }
        try {
            const updated = await client_2.prisma.application.update({
                where: {
                    id: sourceId
                },
                data: {
                    name: input.name.trim()
                }
            });
            return {
                data: this.toSourceRecord(updated)
            };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                const target = this.getErrorTarget(error.meta?.target);
                if (this.isNameCollision(target, error.message)) {
                    throw new SourcesError("A source with this name already exists", 409);
                }
            }
            throw error;
        }
    }
    toSourceRecord(source) {
        return {
            id: source.id,
            organizationId: source.organizationId,
            name: source.name,
            language: source.language,
            apiKey: source.apiKey,
            createdAt: source.createdAt.toISOString(),
            updatedAt: source.updatedAt.toISOString()
        };
    }
    getErrorTarget(target) {
        if (!Array.isArray(target)) {
            return [];
        }
        return target
            .map((item) => (typeof item === "string" ? item : ""))
            .filter((item) => item.length > 0);
    }
    isNameCollision(target, message) {
        const hasOrgNameConstraint = (target.includes("organization_id") || target.includes("organizationId")) &&
            target.includes("name");
        return hasOrgNameConstraint || message.includes("organization_id_name");
    }
    isApiKeyCollision(target, message) {
        return (target.includes("api_key") ||
            target.includes("apiKey") ||
            message.includes("applications_api_key_key"));
    }
}
exports.SourcesService = SourcesService;
