-- Composite index for keyset pagination and range scans.
CREATE INDEX "logs_org_app_timestamp_id_idx"
ON "logs"("organization_id", "application_id", "timestamp", "id");

-- Composite index for level-filtered timeline/list queries.
CREATE INDEX "logs_org_app_level_timestamp_idx"
ON "logs"("organization_id", "application_id", "level", "timestamp");

-- Expression indexes to accelerate metadata-based filters.
CREATE INDEX "logs_org_app_service_timestamp_idx"
ON "logs"(
  "organization_id",
  "application_id",
  (COALESCE("metadata"->>'service', 'unknown')),
  "timestamp"
);

CREATE INDEX "logs_org_app_env_timestamp_idx"
ON "logs"(
  "organization_id",
  "application_id",
  (COALESCE("metadata"->>'env', 'prod')),
  "timestamp"
);
