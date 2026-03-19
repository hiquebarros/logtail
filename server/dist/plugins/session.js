"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSessionPlugin = registerSessionPlugin;
const cookie_1 = __importDefault(require("@fastify/cookie"));
const session_1 = __importDefault(require("@fastify/session"));
function createInMemorySessionStore() {
    // Keep default in-memory behavior and make store injection explicit for Redis later.
    return undefined;
}
async function registerSessionPlugin(app, storeFactory = createInMemorySessionStore) {
    const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-me-32-chars-min";
    const store = storeFactory();
    await app.register(cookie_1.default);
    await app.register(session_1.default, {
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
