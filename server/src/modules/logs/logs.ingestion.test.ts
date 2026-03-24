import assert from "node:assert/strict";
import test from "node:test";
import Fastify, { FastifyInstance } from "fastify";
import { registerAuthPlugin } from "../../plugins/auth";
import { registerLogsController } from "./logs.controller";
import { LogsService } from "./logs.service";
import { prisma } from "../../prisma/client";

type CreateLogsBatchFn = LogsService["createLogsBatch"];
type FindApplicationByApiKeyFn = typeof prisma.application.findUnique;

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await registerAuthPlugin(app);
  await registerLogsController(app);
  return app;
}

test("POST /logs returns 401 without bearer token", async () => {
  const originalFindUnique = prisma.application.findUnique as FindApplicationByApiKeyFn;
  prisma.application.findUnique = (async () => null) as unknown as FindApplicationByApiKeyFn;

  const app = await buildTestApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
      }
    });

    assert.equal(response.statusCode, 401);
  } finally {
    prisma.application.findUnique = originalFindUnique;
    await app.close();
  }
});

test("POST /logs returns 201 with valid bearer token", async () => {
  const originalFindUnique = prisma.application.findUnique as FindApplicationByApiKeyFn;
  const originalCreateLogsBatch = LogsService.prototype.createLogsBatch as CreateLogsBatchFn;

  prisma.application.findUnique = (async () => ({
    id: "20000000-0000-4000-8000-000000000001",
    organizationId: "10000000-0000-4000-8000-000000000001"
  })) as unknown as FindApplicationByApiKeyFn;
  LogsService.prototype.createLogsBatch = (async () => ({
    insertedCount: 1
  })) as unknown as CreateLogsBatchFn;

  const app = await buildTestApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/logs",
      headers: {
        authorization: "Bearer valid-api-key"
      },
      payload: {
        applicationId: "20000000-0000-4000-8000-000000000001",
        logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
      }
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { insertedCount: 1 });
  } finally {
    prisma.application.findUnique = originalFindUnique;
    LogsService.prototype.createLogsBatch = originalCreateLogsBatch;
    await app.close();
  }
});

test("POST /logs returns 403 when body applicationId mismatches token scope", async () => {
  const originalFindUnique = prisma.application.findUnique as FindApplicationByApiKeyFn;
  prisma.application.findUnique = (async () => ({
    id: "20000000-0000-4000-8000-000000000001",
    organizationId: "10000000-0000-4000-8000-000000000001"
  })) as unknown as FindApplicationByApiKeyFn;

  const app = await buildTestApp();
  try {
    const response = await app.inject({
      method: "POST",
      url: "/logs",
      headers: {
        authorization: "Bearer valid-api-key"
      },
      payload: {
        applicationId: "20000000-0000-4000-8000-000000000099",
        logs: [{ timestamp: "2026-03-23T12:00:00.000Z", level: "info", message: "hello" }]
      }
    });

    assert.equal(response.statusCode, 403);
  } finally {
    prisma.application.findUnique = originalFindUnique;
    await app.close();
  }
});
