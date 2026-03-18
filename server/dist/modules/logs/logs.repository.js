"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
class LogsRepository {
    async findLogs(params) {
        const baseWhere = {
            organizationId: params.organizationId,
            applicationId: params.applicationId
        };
        if (params.level) {
            baseWhere.level = params.level;
        }
        if (params.search) {
            baseWhere.message = {
                contains: params.search,
                mode: "insensitive"
            };
        }
        if (params.service) {
            baseWhere.metadata = {
                path: ["service"],
                equals: params.service
            };
        }
        if (params.from || params.to) {
            baseWhere.timestamp = {};
            if (params.from) {
                baseWhere.timestamp.gte = params.from;
            }
            if (params.to) {
                baseWhere.timestamp.lte = params.to;
            }
        }
        const where = params.cursor
            ? {
                AND: [
                    baseWhere,
                    {
                        OR: [
                            { timestamp: { lt: params.cursor.timestamp } },
                            {
                                AND: [
                                    { timestamp: { equals: params.cursor.timestamp } },
                                    { id: { lt: params.cursor.id } }
                                ]
                            }
                        ]
                    }
                ]
            }
            : baseWhere;
        return prisma_1.prisma.log.findMany({
            where,
            orderBy: [{ timestamp: "desc" }, { id: "desc" }],
            take: params.limit + 1
        });
    }
    async createBatch(organizationId, applicationId, logs) {
        const result = await prisma_1.prisma.log.createMany({
            data: logs.map((log) => ({
                organizationId,
                applicationId,
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
                metadata: log.metadata === null || log.metadata === undefined
                    ? client_1.Prisma.JsonNull
                    : log.metadata
            }))
        });
        return result.count;
    }
    async findNewLogs(organizationId, applicationId, since) {
        return prisma_1.prisma.log.findMany({
            where: {
                organizationId,
                applicationId,
                OR: [
                    { timestamp: { gt: since.timestamp } },
                    {
                        AND: [
                            { timestamp: { equals: since.timestamp } },
                            { id: { gt: since.id } }
                        ]
                    }
                ]
            },
            orderBy: [{ timestamp: "asc" }, { id: "asc" }],
            take: 500
        });
    }
    async countLogsByLevel(organizationId, applicationId, from) {
        const where = {
            organizationId,
            applicationId,
            timestamp: { gte: from }
        };
        const [totalLogs, totalErrors, totalWarnings] = await Promise.all([
            prisma_1.prisma.log.count({ where }),
            prisma_1.prisma.log.count({ where: { ...where, level: "error" } }),
            prisma_1.prisma.log.count({ where: { ...where, level: "warn" } })
        ]);
        return { totalLogs, totalErrors, totalWarnings };
    }
    async getLogsPerMinute(organizationId, applicationId, from) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT
        date_trunc('minute', "timestamp") AS "timestamp",
        COUNT(*)::bigint AS "logs",
        SUM(CASE WHEN "level" = 'error' THEN 1 ELSE 0 END)::bigint AS "errors"
      FROM "logs"
      WHERE "organization_id" = ${organizationId}::uuid
        AND "application_id" = ${applicationId}::uuid
        AND "timestamp" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
        return rows.map((row) => ({
            timestamp: row.timestamp,
            logs: Number(row.logs),
            errors: Number(row.errors)
        }));
    }
    async getTopServices(organizationId, applicationId, from) {
        const rows = await prisma_1.prisma.$queryRaw `
      SELECT
        COALESCE("metadata"->>'service', 'unknown') AS "service",
        COUNT(*)::bigint AS "count"
      FROM "logs"
      WHERE "organization_id" = ${organizationId}::uuid
        AND "application_id" = ${applicationId}::uuid
        AND "timestamp" >= ${from}
      GROUP BY 1
      ORDER BY "count" DESC
      LIMIT 6
    `;
        return rows.map((row) => ({
            service: row.service,
            count: Number(row.count)
        }));
    }
}
exports.LogsRepository = LogsRepository;
