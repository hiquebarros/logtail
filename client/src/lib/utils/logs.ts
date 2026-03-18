import type { Log, LogFilters, LogLevel } from "@/lib/types/logs";

type ParsedQuery = {
  terms: string[];
  level?: LogLevel;
  service?: string;
  environment?: Log["environment"];
};

export function parseQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = { terms: [] };
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const [key, value] = token.split(":");
    if (!value) {
      parsed.terms.push(token);
      continue;
    }

    if (key === "level" && isLevel(value)) {
      parsed.level = value;
      continue;
    }

    if (key === "service") {
      parsed.service = value;
      continue;
    }

    if (key === "environment" && isEnvironment(value)) {
      parsed.environment = value;
      continue;
    }

    parsed.terms.push(token);
  }

  return parsed;
}

function isLevel(level: string): level is LogLevel {
  return level === "info" || level === "warn" || level === "error";
}

function isEnvironment(
  environment: string,
): environment is Log["environment"] {
  return (
    environment === "prod" || environment === "staging" || environment === "dev"
  );
}

export function filterLogs(logs: Log[], filters: LogFilters): Log[] {
  const now = Date.now();
  const rangeStart = now - filters.rangeMinutes * 60_000;
  const parsed = parseQuery(filters.query);

  return logs.filter((log) => {
    const timestamp = new Date(log.timestamp).getTime();
    if (timestamp < rangeStart || timestamp > now + 1_000) {
      return false;
    }

    if (filters.levels.length && !filters.levels.includes(log.level)) {
      return false;
    }

    if (filters.services.length && !filters.services.includes(log.service)) {
      return false;
    }

    if (
      filters.environments.length &&
      !filters.environments.includes(log.environment)
    ) {
      return false;
    }

    if (parsed.level && parsed.level !== log.level) {
      return false;
    }

    if (parsed.service && parsed.service !== log.service.toLowerCase()) {
      return false;
    }

    if (parsed.environment && parsed.environment !== log.environment) {
      return false;
    }

    if (!parsed.terms.length) {
      return true;
    }

    const haystack = `${log.message} ${log.service} ${JSON.stringify(log.metadata)}`.toLowerCase();
    return parsed.terms.every((term) => haystack.includes(term));
  });
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

export function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  try {
    const value = Buffer.from(cursor, "base64").toString("utf8");
    const offset = Number(value);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}
