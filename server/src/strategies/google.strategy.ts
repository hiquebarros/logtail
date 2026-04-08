import * as oidc from "openid-client";
import type { AuthStrategy } from "./local.strategy";

export type GoogleStrategyInput = {
  code: string;
  state: string;
  codeVerifier: string;
};

export type GoogleIdentity = {
  provider: "google";
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

let cachedGoogleConfig: oidc.Configuration | null = null;

async function getGoogleConfig(clientId: string, clientSecret: string): Promise<oidc.Configuration> {
  if (cachedGoogleConfig) return cachedGoogleConfig;
  cachedGoogleConfig = await oidc.discovery(
    new URL("https://accounts.google.com"),
    clientId,
    clientSecret
  );
  return cachedGoogleConfig;
}

export class GoogleStrategy implements AuthStrategy<GoogleStrategyInput, GoogleIdentity> {
  async authenticate(input: GoogleStrategyInput): Promise<GoogleIdentity> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Google OAuth is not configured (missing GOOGLE_* env vars)");
    }

    const config = await getGoogleConfig(clientId, clientSecret);
    const currentUrl = new URL(redirectUri);
    currentUrl.searchParams.set("code", input.code);
    currentUrl.searchParams.set("state", input.state);

    const tokens = await oidc.authorizationCodeGrant(
      config,
      currentUrl,
      {
        expectedState: input.state,
        pkceCodeVerifier: input.codeVerifier
      },
      undefined,
      undefined
    );

    const accessToken = (tokens as { access_token?: string }).access_token;
    if (!accessToken) {
      throw new Error("Google OAuth did not return an access token");
    }

    const userinfo = await oidc.fetchUserInfo(config, accessToken, oidc.skipSubjectCheck);
    const sub = (userinfo as { sub?: unknown }).sub;
    const email = (userinfo as { email?: unknown }).email;
    const emailVerified = Boolean((userinfo as { email_verified?: unknown }).email_verified);
    const nameRaw = (userinfo as { name?: unknown }).name;
    const name = typeof nameRaw === "string" ? nameRaw : undefined;

    if (!sub || typeof sub !== "string") {
      throw new Error("Google OAuth did not return a subject (sub)");
    }
    if (!email || typeof email !== "string") {
      throw new Error("Google OAuth did not return an email");
    }

    return {
      provider: "google",
      providerAccountId: sub,
      email: email.toLowerCase(),
      emailVerified,
      name
    };
  }
}
