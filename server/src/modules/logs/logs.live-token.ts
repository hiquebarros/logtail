import { createHmac, timingSafeEqual } from "node:crypto";

type LiveTailTokenPayload = {
  organizationId: string;
  applicationId: string;
  exp: number;
};

const TOKEN_PREFIX = "lt1";
const DEFAULT_TTL_SECONDS = 60;

function getTokenSecret(): string {
  const secret =
    process.env.LIVE_TAIL_TOKEN_SECRET ||
    process.env.SESSION_SECRET ||
    "dev-session-secret-change-me-32-chars-min";
  if (secret.length < 32) {
    throw new Error("LIVE_TAIL_TOKEN_SECRET must have length 32 or greater");
  }

  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getTokenSecret()).update(data).digest("base64url");
}

export function issueLiveTailToken(
  payload: Omit<LiveTailTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const body: LiveTailTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };
  const encodedBody = Buffer.from(JSON.stringify(body), "utf-8").toString("base64url");
  const signature = sign(encodedBody);
  return `${TOKEN_PREFIX}.${encodedBody}.${signature}`;
}

export function verifyLiveTailToken(token: string): LiveTailTokenPayload | null {
  const [prefix, encodedBody, signature] = token.split(".");
  if (!prefix || !encodedBody || !signature || prefix !== TOKEN_PREFIX) {
    return null;
  }

  const expectedSignature = sign(encodedBody);
  const signatureBuffer = Buffer.from(signature, "utf-8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedBody, "base64url").toString("utf-8")
    ) as LiveTailTokenPayload;

    if (
      !payload.organizationId ||
      !payload.applicationId ||
      typeof payload.exp !== "number" ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
