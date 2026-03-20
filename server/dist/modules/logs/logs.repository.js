"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
class LogsRepository {
    async findLogs(params) {
        const baseWhere = {
            organizationId: params.organizationId,
            applicationId: params.applicationId
        };
        if (params.levels.length > 0) {
            baseWhere.level = { in: params.levels };
        }
        if (params.search) {
            baseWhere.message = {
                contains: params.search,
                mode: "insensitive"
            };
        }
        if (params.services.length > 0) {
            const existingAnd = Array.isArray(baseWhere.AND)
                ? baseWhere.AND
                : baseWhere.AND
                    ? [baseWhere.AND]
                    : [];
            baseWhere.AND = [
                ...existingAnd,
                {
                    OR: params.services.map((service) => ({
                        metadata: {
                            path: ["service"],
                            equals: service
                        }
                    }))
                }
            ];
        }
        if (params.environments.length > 0) {
            const existingAnd = Array.isArray(baseWhere.AND)
                ? baseWhere.AND
                : baseWhere.AND
                    ? [baseWhere.AND]
                    : [];
            baseWhere.AND = [
                ...existingAnd,
                {
                    OR: params.environments.map((environment) => ({
                        metadata: {
                            path: ["env"],
                            equals: environment
                        }
                    }))
                }
            ];
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
        return client_2.prisma.log.findMany({
            where,
            orderBy: [{ timestamp: "desc" }, { id: "desc" }],
            take: params.limit + 1
        });
    }
    async getHistogram(params, bucketSizeMs) {
        const whereClauses = [
            client_1.Prisma.sql `"organization_id" = ${params.organizationId}::uuid`,
            client_1.Prisma.sql `"application_id" = ${params.applicationId}::uuid`,
            client_1.Prisma.sql `"timestamp" >= ${params.from}`,
            client_1.Prisma.sql `"timestamp" <= ${params.to}`
        ];
        if (params.levels.length > 0) {
            whereClauses.push(client_1.Prisma.sql `"level" IN (${client_1.Prisma.join(params.levels)})`);
        }
        if (params.services.length > 0) {
            whereClauses.push(client_1.Prisma.sql `COALESCE("metadata"->>'service', 'unknown') IN (${client_1.Prisma.join(params.services)})`);
        }
        if (params.environments.length > 0) {
            whereClauses.push(client_1.Prisma.sql `COALESCE("metadata"->>'env', 'prod') IN (${client_1.Prisma.join(params.environments)})`);
        }
        if (params.search) {
            whereClauses.push(client_1.Prisma.sql `"message" ILIKE ${`%${params.search}%`}`);
        }
        const whereSql = client_1.Prisma.join(whereClauses, " AND ");
        const rows = await client_2.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        (
          FLOOR((EXTRACT(EPOCH FROM "timestamp") * 1000) / ${bucketSizeMs})::bigint * ${bucketSizeMs}
        ) AS "ts",
        COUNT(*)::bigint AS "count"
      FROM "logs"
      WHERE ${whereSql}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
        return rows.map((row) => ({
            ts: Number(row.ts),
            count: Number(row.count)
        }));
    }
    async createBatch(organizationId, applicationId, logs) {
        const result = await client_2.prisma.log.createMany({
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
        return client_2.prisma.log.findMany({
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
            client_2.prisma.log.count({ where }),
            client_2.prisma.log.count({ where: { ...where, level: "error" } }),
            client_2.prisma.log.count({ where: { ...where, level: "warn" } })
        ]);
        return { totalLogs, totalErrors, totalWarnings };
    }
    async getLogsPerMinute(organizationId, applicationId, from) {
        const rows = await client_2.prisma.$queryRaw `
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
        const rows = await client_2.prisma.$queryRaw `
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
