export type DbConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  url: string;
};

export function getDbConfig(): DbConfig {
  const host = process.env.DB_HOST || "db";
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "postgres";
  const database = process.env.DB_NAME || "logtail";
  const url =
    process.env.DATABASE_URL ||
    `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`;

  return {
    host,
    port,
    user,
    password,
    database,
    url
  };
}
