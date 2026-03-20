"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsService = void 0;
const logs_parser_1 = require("./logs.parser");
class RequestError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
const MICROSECONDS_IN_MILLISECOND = BigInt(1000);
const MIN_DATE_MS = BigInt("-8640000000000000");
const MAX_DATE_MS = BigInt("8640000000000000");
const DEFAULT_HISTOGRAM_BUCKET_MS = 10 * 60 * 1000;
const MAX_HISTOGRAM_BUCKETS = 1500;
const MIN_BUCKET_MS = 1000;
const MAX_BUCKET_MS = 24 * 60 * 60 * 1000;
class LogsService {
    constructor(logsRepository) {
        this.logsRepository = logsRepository;
    }
    async getLogs(query) {
        const filters = this.parseGetLogsFilters(query);
        const rows = await this.logsRepository.findLogs(filters);
        const hasMore = rows.length > filters.limit;
        const pageRows = hasMore ? rows.slice(0, filters.limit) : rows;
        const data = pageRows.map((row) => ({
            id: row.id,
            organizationId: row.organizationId,
            applicationId: row.applicationId,
            timestamp: row.timestamp.toISOString(),
            level: row.level,
            message: row.message,
            metadata: row.metadata ?? null
        }));
        const nextCursor = hasMore
            ? this.encodeCursor({
                timestamp: pageRows[pageRows.length - 1].timestamp,
                id: pageRows[pageRows.length - 1].id
            })
            : null;
        return { data, nextCursor };
    }
    async getHistogram(query) {
        const filters = this.parseGetHistogramFilters(query);
        const rangeMs = Math.max(filters.to.getTime() - filters.from.getTime(), MIN_BUCKET_MS);
        const bucketSizeMs = this.normalizeBucketSize(filters.bucketSizeMs ?? DEFAULT_HISTOGRAM_BUCKET_MS, rangeMs);
        const buckets = await this.logsRepository.getHistogram(filters, bucketSizeMs);
        const totalInRange = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
        return {
            buckets,
            bucketSizeMs,
            totalInRange
        };
    }
    async createLogsBatch(body) {
        const parsedBody = this.parseCreateLogsBody(body);
        const insertedCount = await this.logsRepository.createBatch(parsedBody.organizationId, parsedBody.applicationId, parsedBody.logs);
        return { insertedCount };
    }
    async getMetrics(query) {
        const filters = this.parseGetMetricsFilters(query);
        const from = new Date(Date.now() - filters.rangeMinutes * 60000);
        const [totals, logsPerMinuteRows, topServicesRows] = await Promise.all([
            this.logsRepository.countLogsByLevel(filters.organizationId, filters.applicationId, from),
            this.logsRepository.getLogsPerMinute(filters.organizationId, filters.applicationId, from),
            this.logsRepository.getTopServices(filters.organizationId, filters.applicationId, from)
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
    parseStreamFilters(query) {
        const parsedQuery = query;
        return {
            organizationId: this.requireString(parsedQuery.organizationId, "organizationId is required"),
            applicationId: this.requireString(parsedQuery.applicationId, "applicationId is required")
        };
    }
    async getNewLogsForStream(filters, since) {
        const rows = await this.logsRepository.findNewLogs(filters.organizationId, filters.applicationId, since);
        if (rows.length === 0) {
            return { logs: [], lastCursor: since };
        }
        const logs = rows.map((row) => ({
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
    parseGetLogsFilters(input) {
        const query = input;
        const organizationId = this.requireString(query.organizationId, "organizationId is required");
        const applicationId = this.requireString(query.applicationId, "applicationId is required");
        const { from, to } = this.parseQueryTimeRange(query);
        const explicitLevels = this.parseCsv(query.levels);
        const legacyLevel = this.parseOptionalNonEmptyString(query.level);
        const rawSearch = this.parseOptionalNonEmptyString(query.search);
        const parsedSearch = (0, logs_parser_1.parseLogSearch)(rawSearch ?? "");
        const search = parsedSearch.text || undefined;
        const explicitServices = this.parseCsv(query.services);
        const explicitEnvironments = this.parseCsv(query.environments);
        const levelFromSearch = parsedSearch.filters.level;
        const serviceFromSearch = parsedSearch.filters.service;
        const cursor = this.parseCursor(query.cursor);
        const limit = this.parseLimit(query.limit);
        const levels = this.toUnique([
            ...explicitLevels,
            ...(legacyLevel ? [legacyLevel] : []),
            ...(levelFromSearch ? [levelFromSearch] : [])
        ], this.normalizeValue);
        const services = this.toUnique([...explicitServices, ...(serviceFromSearch ? [serviceFromSearch] : [])], this.normalizeValue);
        const environments = this.toUnique(explicitEnvironments, this.normalizeValue);
        return {
            organizationId,
            applicationId,
            from,
            to,
            levels,
            services,
            environments,
            search,
            cursor,
            limit
        };
    }
    parseGetHistogramFilters(input) {
        const query = input;
        const base = this.parseGetLogsFilters(query);
        if (!base.from || !base.to) {
            throw new RequestError("rf and rt must both be provided for histogram");
        }
        const bucketSizeMs = this.parseOptionalBucketSize(query.bucketSizeMs);
        return {
            organizationId: base.organizationId,
            applicationId: base.applicationId,
            from: base.from,
            to: base.to,
            levels: base.levels,
            services: base.services,
            environments: base.environments,
            search: base.search,
            bucketSizeMs
        };
    }
    parseQueryTimeRange(query) {
        const hasCanonicalRange = query.rf !== undefined || query.rt !== undefined;
        if (hasCanonicalRange) {
            if (!query.rf || !query.rt) {
                throw new RequestError("rf and rt must both be provided");
            }
            const from = this.parseMicrosecondsDate(query.rf, "rf");
            const to = this.parseMicrosecondsDate(query.rt, "rt");
            if (from > to) {
                throw new RequestError("rf must be less than or equal to rt");
            }
            return { from, to };
        }
        const from = this.parseOptionalDate(query.from, "from");
        const to = this.parseOptionalDate(query.to, "to");
        if (from || to) {
            if (from && to && from > to) {
                throw new RequestError("from must be less than or equal to to");
            }
            // TODO(remove-legacy-range): remove ISO from/to fallback after migration window.
            return { from, to };
        }
        if (query.rangeMinutes !== undefined) {
            const rangeMinutes = this.parseLegacyRangeMinutes(query.rangeMinutes);
            const toDate = new Date();
            const fromDate = new Date(toDate.getTime() - rangeMinutes * 60000);
            // TODO(remove-legacy-range): remove rangeMinutes fallback after migration window.
            return { from: fromDate, to: toDate };
        }
        return {};
    }
    parseGetMetricsFilters(input) {
        const query = input;
        const rangeMinutesRaw = Number(query.rangeMinutes ?? 60);
        const rangeMinutes = Number.isFinite(rangeMinutesRaw)
            ? Math.min(Math.max(Math.floor(rangeMinutesRaw), 5), 24 * 60)
            : 60;
        return {
            organizationId: this.requireString(query.organizationId, "organizationId is required"),
            applicationId: this.requireString(query.applicationId, "applicationId is required"),
            rangeMinutes
        };
    }
    parseCreateLogsBody(input) {
        const body = input;
        const organizationId = this.requireString(body.organizationId, "organizationId is required");
        const applicationId = this.requireString(body.applicationId, "applicationId is required");
        if (!Array.isArray(body.logs) || body.logs.length === 0) {
            throw new RequestError("logs must be a non-empty array");
        }
        const logs = body.logs.map((log, index) => {
            const timestamp = this.parseRequiredDate(log.timestamp, `logs[${index}].timestamp is required and must be valid`);
            const level = this.requireString(log.level, `logs[${index}].level is required`);
            const message = this.requireString(log.message, `logs[${index}].message is required`);
            return {
                timestamp,
                level,
                message,
                metadata: log.metadata ?? null
            };
        });
        return { organizationId, applicationId, logs };
    }
    parseLimit(rawLimit) {
        if (!rawLimit) {
            return 100;
        }
        const parsed = Number(rawLimit);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new RequestError("limit must be a positive number");
        }
        return Math.min(Math.floor(parsed), 500);
    }
    parseOptionalBucketSize(raw) {
        if (!raw) {
            return undefined;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new RequestError("bucketSizeMs must be a positive number");
        }
        return Math.min(Math.max(Math.floor(parsed), MIN_BUCKET_MS), MAX_BUCKET_MS);
    }
    parseCursor(rawCursor) {
        if (!rawCursor) {
            return undefined;
        }
        try {
            const decoded = Buffer.from(rawCursor, "base64url").toString("utf-8");
            const parsed = JSON.parse(decoded);
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
        }
        catch {
            throw new RequestError("cursor is invalid");
        }
    }
    encodeCursor(cursor) {
        return Buffer.from(JSON.stringify({
            t: cursor.timestamp.toISOString(),
            i: cursor.id
        }), "utf-8").toString("base64url");
    }
    parseOptionalDate(value, fieldName) {
        if (!value) {
            return undefined;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            throw new RequestError(`${fieldName} must be a valid datetime`);
        }
        return date;
    }
    parseMicrosecondsDate(value, fieldName) {
        let micros;
        try {
            micros = BigInt(value);
        }
        catch {
            throw new RequestError(`${fieldName} must be a numeric unix timestamp in microseconds`);
        }
        const millis = micros / MICROSECONDS_IN_MILLISECOND;
        if (millis < MIN_DATE_MS || millis > MAX_DATE_MS) {
            throw new RequestError(`${fieldName} is outside supported datetime bounds`);
        }
        const millisNumber = Number(millis);
        if (!Number.isSafeInteger(millisNumber)) {
            throw new RequestError(`${fieldName} is outside safe numeric bounds`);
        }
        const date = new Date(millisNumber);
        if (Number.isNaN(date.getTime())) {
            throw new RequestError(`${fieldName} must be a valid unix timestamp in microseconds`);
        }
        return date;
    }
    parseLegacyRangeMinutes(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new RequestError("rangeMinutes must be a number");
        }
        const rounded = Math.floor(parsed);
        if (rounded <= 0) {
            throw new RequestError("rangeMinutes must be greater than 0");
        }
        return Math.min(rounded, 24 * 60);
    }
    parseRequiredDate(value, message) {
        const date = this.parseOptionalDate(value, "timestamp");
        if (!date) {
            throw new RequestError(message);
        }
        return date;
    }
    parseOptionalNonEmptyString(value) {
        if (!value) {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    parseCsv(value) {
        if (!value) {
            return [];
        }
        return value
            .split(",")
            .map(this.normalizeValue)
            .filter((item) => item.length > 0);
    }
    normalizeValue(value) {
        return value.trim().toLowerCase();
    }
    toUnique(values, mapper) {
        const result = [];
        const seen = new Set();
        for (const value of values) {
            const mapped = mapper(value);
            if (mapped.length === 0 || seen.has(mapped)) {
                continue;
            }
            seen.add(mapped);
            result.push(mapped);
        }
        return result;
    }
    normalizeBucketSize(bucketSizeMs, rangeMs) {
        const safeRange = Math.max(rangeMs, MIN_BUCKET_MS);
        const safeBucket = Math.min(Math.max(bucketSizeMs, MIN_BUCKET_MS), MAX_BUCKET_MS);
        const bucketCount = Math.ceil(safeRange / safeBucket);
        if (bucketCount <= MAX_HISTOGRAM_BUCKETS) {
            return safeBucket;
        }
        const scaled = Math.ceil(safeRange / MAX_HISTOGRAM_BUCKETS);
        return Math.min(MAX_BUCKET_MS, Math.max(MIN_BUCKET_MS, Math.ceil(scaled / 1000) * 1000));
    }
    requireString(value, message) {
        if (!value || value.trim().length === 0) {
            throw new RequestError(message);
        }
        return value.trim();
    }
}
exports.LogsService = LogsService;
