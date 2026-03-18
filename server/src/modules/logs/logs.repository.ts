import { Prisma, type Log as PrismaLog } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { CreateLogInput, GetLogsFilters } from "./logs.types";

type FindLogsParams = GetLogsFilters;

export class LogsRepository {
  async findLogs(params: FindLogsParams): Promise<PrismaLog[]> {
    const baseWhere: Prisma.LogWhereInput = {
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

    const where: Prisma.LogWhereInput = params.cursor
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

    return prisma.log.findMany({
      where,
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      take: params.limit + 1
    });
  }

  async createBatch(
    organizationId: string,
    applicationId: string,
    logs: CreateLogInput[]
  ): Promise<number> {
    const result = await prisma.log.createMany({
      data: logs.map((log) => ({
        organizationId,
        applicationId,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        metadata:
          log.metadata === null || log.metadata === undefined
            ? Prisma.JsonNull
            : (log.metadata as Prisma.InputJsonValue)
      }))
    });

    return result.count;
  }

  async findNewLogs(
    organizationId: string,
    applicationId: string,
    since: { timestamp: Date; id: string }
  ): Promise<PrismaLog[]> {
    return prisma.log.findMany({
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

  async countLogsByLevel(
    organizationId: string,
    applicationId: string,
    from: Date
  ): Promise<{ totalLogs: number; totalErrors: number; totalWarnings: number }> {
    const where: Prisma.LogWhereInput = {
      organizationId,
      applicationId,
      timestamp: { gte: from }
    };

    const [totalLogs, totalErrors, totalWarnings] = await Promise.all([
      prisma.log.count({ where }),
      prisma.log.count({ where: { ...where, level: "error" } }),
      prisma.log.count({ where: { ...where, level: "warn" } })
    ]);

    return { totalLogs, totalErrors, totalWarnings };
  }

  async getLogsPerMinute(
    organizationId: string,
    applicationId: string,
    from: Date
  ): Promise<Array<{ timestamp: Date; logs: number; errors: number }>> {
    const rows = await prisma.$queryRaw<
      Array<{ timestamp: Date; logs: bigint; errors: bigint }>
    >`
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

  async getTopServices(
    organizationId: string,
    applicationId: string,
    from: Date
  ): Promise<Array<{ service: string; count: number }>> {
    const rows = await prisma.$queryRaw<Array<{ service: string; count: bigint }>>`
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
