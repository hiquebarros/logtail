import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

test("middleware does not redirect POST /api/logs/:sourceId", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => {
    throw new Error("fetch should not be called for public ingestion endpoint");
  }) as typeof fetch;

  try {
    const request = new NextRequest("http://localhost:3000/api/logs/source-123", {
      method: "POST"
    });

    const response = await middleware(request);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  } finally {
    global.fetch = originalFetch;
  }
});
