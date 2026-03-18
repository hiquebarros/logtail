import { LogsRepository } from "./logs.repository";
import { parseLogSearch } from "./logs.parser";
import {
  CreateLogInput,
  CreateLogsBatchRequest,
  GetMetricsFilters,
  GetMetricsQuery,
  GetLogsFilters,
  GetLogsQuery,
  LogItem,
  LogsCursor,
  LogsPage,
  MetricsResponse,
  StreamLogsFilters,
  StreamLogsQuery
} from "./logs.types";

class RequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class LogsService {
  constructor(private readonly logsRepository: LogsRepository) {}

  async getLogs(query: unknown): Promise<LogsPage> {
    const filters = this.parseGetLogsFilters(query);
    const rows = await this.logsRepository.findLogs(filters);
    const hasMore = rows.length > filters.limit;
    const pageRows = hasMore ? rows.slice(0, filters.limit) : rows;

    const data: LogItem[] = pageRows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      applicationId: row.applicationId,
      timestamp: row.timestamp.toISOString(),
      level: row.level,
      message: row.message,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null
    }));

    const nextCursor = hasMore
      ? this.encodeCursor({
          timestamp: pageRows[pageRows.length - 1].timestamp,
          id: pageRows[pageRows.length - 1].id
        })
      : null;

    return { data, nextCursor };
  }

  async createLogsBatch(body: unknown): Promise<{ insertedCount: number }> {
    const parsedBody = this.parseCreateLogsBody(body);

    const insertedCount = await this.logsRepository.createBatch(
      parsedBody.organizationId,
      parsedBody.applicationId,
      parsedBody.logs
    );

    return { insertedCount };
  }

  async getMetrics(query: unknown): Promise<MetricsResponse> {
    const filters = this.parseGetMetricsFilters(query);
    const from = new Date(Date.now() - filters.rangeMinutes * 60_000);

    const [totals, logsPerMinuteRows, topServicesRows] = await Promise.all([
      this.logsRepository.countLogsByLevel(
        filters.organizationId,
        filters.applicationId,
        from
      ),
      this.logsRepository.getLogsPerMinute(
        filters.organizationId,
        filters.applicationId,
        from
      ),
      this.logsRepository.getTopServices(
        filters.organizationId,
        filters.applicationId,
        from
      )
    ]);

    return {
      totalLogs: totals.totalLogs,
      totalErrors: totals.totalErrors,
      totalWarnings: totals.totalWarnings,
      logsPerMinute: logsPerMinuteRows.map((row) => ({
        timestamp: row.timestamp.toISOString(),
        logs: row.logs,
        errors: row.errors,
        errorRate: row.logs > 0 ? Number((row.errors / row.logs).toFixed(3)) : 0
      })),
      topServices: topServicesRows
    };
  }

  parseStreamFilters(query: unknown): StreamLogsFilters {
    const parsedQuery = query as StreamLogsQuery;

    return {
      organizationId: this.requireString(
        parsedQuery.organizationId,
        "organizationId is required"
      ),
      applicationId: this.requireString(
        parsedQuery.applicationId,
        "applicationId is required"
      )
    };
  }

  async getNewLogsForStream(
    filters: StreamLogsFilters,
    since: LogsCursor
  ): Promise<{ logs: LogItem[]; lastCursor: LogsCursor }> {
    const rows = await this.logsRepository.findNewLogs(
      filters.organizationId,
      filters.applicationId,
      since
    );

    if (rows.length === 0) {
      return { logs: [], lastCursor: since };
    }

    const logs: LogItem[] = rows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      applicationId: row.applicationId,
      timestamp: row.timestamp.toISOString(),
      level: row.level,
      message: row.message,
      metadata: row.metadata
    }));

    const last = rows[rows.length - 1];

    return {
      logs,
      lastCursor: {
        timestamp: last.timestamp,
        id: last.id
      }
    };
  }

  private parseGetLogsFilters(input: unknown): GetLogsFilters {
    const query = input as GetLogsQuery;

    const organizationId = this.requireString(
      query.organizationId,
      "organizationId is required"
    );
    const applicationId = this.requireString(
      query.applicationId,
      "applicationId is required"
    );

    const from = this.parseOptionalDate(query.from, "from");
    const to = this.parseOptionalDate(query.to, "to");

    if (from && to && from > to) {
      throw new RequestError("from must be less than or equal to to");
    }

    const level = this.parseOptionalNonEmptyString(query.level);
    const rawSearch = this.parseOptionalNonEmptyString(query.search);
    const parsedSearch = parseLogSearch(rawSearch ?? "");
    const service = parsedSearch.filters.service;
    const search = parsedSearch.text || undefined;
    const cursor = this.parseCursor(query.cursor);
    const limit = this.parseLimit(query.limit);
    const parsedLevel = parsedSearch.filters.level;

    return {
      organizationId,
      applicationId,
      from,
      to,
      level: level ?? parsedLevel,
      service,
      search,
      cursor,
      limit
    };
  }

  private parseGetMetricsFilters(input: unknown): GetMetricsFilters {
    const query = input as GetMetricsQuery;
    const rangeMinutesRaw = Number(query.rangeMinutes ?? 60);
    const rangeMinutes = Number.isFinite(rangeMinutesRaw)
      ? Math.min(Math.max(Math.floor(rangeMinutesRaw), 5), 24 * 60)
      : 60;

    return {
      organizationId: this.requireString(
        query.organizationId,
        "organizationId is required"
      ),
      applicationId: this.requireString(
        query.applicationId,
        "applicationId is required"
      ),
      rangeMinutes
    };
  }

  private parseCreateLogsBody(input: unknown): {
    organizationId: string;
    applicationId: string;
    logs: CreateLogInput[];
  } {
    const body = input as CreateLogsBatchRequest;

    const organizationId = this.requireString(
      body.organizationId,
      "organizationId is required"
    );
    const applicationId = this.requireString(
      body.applicationId,
      "applicationId is required"
    );

    if (!Array.isArray(body.logs) || body.logs.length === 0) {
      throw new RequestError("logs must be a non-empty array");
    }

    const logs = body.logs.map((log, index) => {
      const timestamp = this.parseRequiredDate(
        log.timestamp,
        `logs[${index}].timestamp is required and must be valid`
      );
      const level = this.requireString(
        log.level,
        `logs[${index}].level is required`
      );
      const message = this.requireString(
        log.message,
        `logs[${index}].message is required`
      );

      return {
        timestamp,
        level,
        message,
        metadata: log.metadata ?? null
      };
    });

    return { organizationId, applicationId, logs };
  }

  private parseLimit(rawLimit?: string): number {
    if (!rawLimit) {
      return 100;
    }

    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new RequestError("limit must be a positive number");
    }

    return Math.min(Math.floor(parsed), 1000);
  }

  private parseCursor(rawCursor?: string): LogsCursor | undefined {
    if (!rawCursor) {
      return undefined;
    }

    try {
      const decoded = Buffer.from(rawCursor, "base64url").toString("utf-8");
      const parsed = JSON.parse(decoded) as { t?: string; i?: string };

      if (!parsed.t || !parsed.i) {
        throw new Error("missing cursor fields");
      }

      const timestamp = new Date(parsed.t);
      if (Number.isNaN(timestamp.getTime())) {
        throw new Error("invalid timestamp");
      }

      return {
        timestamp,
        id: parsed.i
      };
    } catch {
      throw new RequestError("cursor is invalid");
    }
  }

  private encodeCursor(cursor: LogsCursor): string {
    return Buffer.from(
      JSON.stringify({
        t: cursor.timestamp.toISOString(),
        i: cursor.id
      }),
      "utf-8"
    ).toString("base64url");
  }

  private parseOptionalDate(
    value: string | undefined,
    fieldName: string
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new RequestError(`${fieldName} must be a valid datetime`);
    }

    return date;
  }

  private parseRequiredDate(value: string | undefined, message: string): Date {
    const date = this.parseOptionalDate(value, "timestamp");
    if (!date) {
      throw new RequestError(message);
    }

    return date;
  }

  private parseOptionalNonEmptyString(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private requireString(value: string | undefined, message: string): string {
    if (!value || value.trim().length === 0) {
      throw new RequestError(message);
    }

    return value.trim();
  }
}
