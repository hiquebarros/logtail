import cookie from "@fastify/cookie";
import fastifySession, { SessionStore } from "@fastify/session";
import { FastifyInstance } from "fastify";

export type SessionStoreFactory = () => SessionStore | undefined;

function createInMemorySessionStore(): SessionStore | undefined {
  // Keep default in-memory behavior and make store injection explicit for Redis later.
  return undefined;
}

export async function registerSessionPlugin(
  app: FastifyInstance,
  storeFactory: SessionStoreFactory = createInMemorySessionStore
): Promise<void> {
  const sessionSecret =
    process.env.SESSION_SECRET || "dev-session-secret-change-me-32-chars-min";
  const store = storeFactory();

  await app.register(cookie);
  await app.register(fastifySession, {
    secret: sessionSecret,
    ...(store ? { store } : {}),
    cookieName: "logtail.sid",
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  });
}
