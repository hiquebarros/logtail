"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueLiveTailToken = issueLiveTailToken;
exports.verifyLiveTailToken = verifyLiveTailToken;
const node_crypto_1 = require("node:crypto");
const TOKEN_PREFIX = "lt1";
const DEFAULT_TTL_SECONDS = 60;
function getTokenSecret() {
    const secret = process.env.LIVE_TAIL_TOKEN_SECRET ||
        process.env.SESSION_SECRET ||
        "dev-session-secret-change-me-32-chars-min";
    if (secret.length < 32) {
        throw new Error("LIVE_TAIL_TOKEN_SECRET must have length 32 or greater");
    }
    return secret;
}
function sign(data) {
    return (0, node_crypto_1.createHmac)("sha256", getTokenSecret()).update(data).digest("base64url");
}
function issueLiveTailToken(payload, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const body = {
        ...payload,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds
    };
    const encodedBody = Buffer.from(JSON.stringify(body), "utf-8").toString("base64url");
    const signature = sign(encodedBody);
    return `${TOKEN_PREFIX}.${encodedBody}.${signature}`;
}
function verifyLiveTailToken(token) {
    const [prefix, encodedBody, signature] = token.split(".");
    if (!prefix || !encodedBody || !signature || prefix !== TOKEN_PREFIX) {
        return null;
    }
    const expectedSignature = sign(encodedBody);
    const signatureBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    if (signatureBuffer.length !== expectedBuffer.length ||
        !(0, node_crypto_1.timingSafeEqual)(signatureBuffer, expectedBuffer)) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf-8"));
        if (!payload.organizationId ||
            !payload.applicationId ||
            typeof payload.exp !== "number" ||
            payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    }
    catch {
        return null;
    }
}
