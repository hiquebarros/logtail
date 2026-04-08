"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleStrategy = void 0;
const oidc = __importStar(require("openid-client"));
let cachedGoogleConfig = null;
async function getGoogleConfig(clientId, clientSecret) {
    if (cachedGoogleConfig)
        return cachedGoogleConfig;
    cachedGoogleConfig = await oidc.discovery(new URL("https://accounts.google.com"), clientId, clientSecret);
    return cachedGoogleConfig;
}
class GoogleStrategy {
    async authenticate(input) {
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
        const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
            expectedState: input.state,
            pkceCodeVerifier: input.codeVerifier
        }, undefined, undefined);
        const accessToken = tokens.access_token;
        if (!accessToken) {
            throw new Error("Google OAuth did not return an access token");
        }
        const userinfo = await oidc.fetchUserInfo(config, accessToken, oidc.skipSubjectCheck);
        const sub = userinfo.sub;
        const email = userinfo.email;
        const emailVerified = Boolean(userinfo.email_verified);
        const nameRaw = userinfo.name;
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
exports.GoogleStrategy = GoogleStrategy;
