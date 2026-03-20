import { Prisma, type Log as PrismaLog } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { CreateLogInput, GetHistogramFilters, GetLogsFilters } from "./logs.types";

type FindLogsParams = GetLogsFilters;

export class LogsRepository {
  async findLogs(params: FindLogsParams): Promise<PrismaLog[]> {
    const baseWhere: Prisma.LogWhereInput = {
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

  async getHistogram(
    params: GetHistogramFilters,
    bucketSizeMs: number
  ): Promise<Array<{ ts: number; count: number }>> {
    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`"organization_id" = ${params.organizationId}::uuid`,
      Prisma.sql`"application_id" = ${params.applicationId}::uuid`,
      Prisma.sql`"timestamp" >= ${params.from}`,
      Prisma.sql`"timestamp" <= ${params.to}`
    ];

    if (params.levels.length > 0) {
      whereClauses.push(Prisma.sql`"level" IN (${Prisma.join(params.levels)})`);
    }

    if (params.services.length > 0) {
      whereClauses.push(
        Prisma.sql`COALESCE("metadata"->>'service', 'unknown') IN (${Prisma.join(params.services)})`
      );
    }

    if (params.environments.length > 0) {
      whereClauses.push(
        Prisma.sql`COALESCE("metadata"->>'env', 'prod') IN (${Prisma.join(params.environments)})`
      );
    }

    if (params.search) {
      whereClauses.push(Prisma.sql`"message" ILIKE ${`%${params.search}%`}`);
    }

    const whereSql = Prisma.join(whereClauses, " AND ");
    const rows = await prisma.$queryRaw<Array<{ ts: bigint; count: bigint }>>(Prisma.sql`
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
