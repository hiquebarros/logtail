import { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "crypto";
import {
  googleCallbackQuerySchema,
  googleStartQuerySchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  switchOrganizationSchema,
  verifyEmailSchema
} from "./auth.schemas";
import { AuthError, AuthService } from "./auth.service";
import { LocalStrategy } from "../../strategies/local.strategy";
import { GoogleStrategy } from "../../strategies/google.strategy";

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(input: string): string {
  return base64UrlEncode(createHash("sha256").update(input).digest());
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly localStrategy: LocalStrategy,
    private readonly googleStrategy = new GoogleStrategy()
  ) {}

  login = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request body",
        issues: parsed.error.flatten()
      });
      return;
    }

    try {
      const user = await this.localStrategy.authenticate(parsed.data);
      const activeMembership = await this.authService.getActiveMembershipForUser(user.id);
      if (!activeMembership) {
        reply.code(403).send({ message: "User has no active organization membership" });
        return;
      }

      await this.authService.createUserSession(
        request,
        user,
        activeMembership.organizationId
      );

      reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email
        },
        activeOrganization: {
          id: activeMembership.organizationId,
          name: activeMembership.organizationName,
          role: activeMembership.role
        }
      });
    } catch (error) {
      if (error instanceof AuthError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
      }

      throw error;
    }
  };

  register = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request body",
        issues: parsed.error.flatten()
      });
      return;
    }

    try {
      const created = await this.authService.createUserWithOrganization(parsed.data);
      await this.authService.sendVerificationEmail(created.user.id, this.getAppBaseUrl());

      reply.code(201).send({
        success: true,
        message: "Account created. Check your inbox to verify your email before signing in.",
        user: { id: created.user.id, email: created.user.email }
      });
    } catch (error) {
      if (error instanceof AuthError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
      }

      throw error;
    }
  };

  verifyEmail = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = verifyEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request body",
        issues: parsed.error.flatten()
      });
      return;
    }

    try {
      const user = await this.authService.verifyEmailToken(parsed.data.token);
      const activeMembership = await this.authService.getActiveMembershipForUser(user.id);
      if (!activeMembership) {
        reply.code(403).send({ message: "User has no active organization membership" });
        return;
      }

      await this.authService.createUserSession(
        request,
        user,
        activeMembership.organizationId
      );

      reply.send({
        success: true,
        message: "Email verified. Your account is ready.",
        user: {
          id: user.id,
          email: user.email
        },
        activeOrganization: {
          id: activeMembership.organizationId,
          name: activeMembership.organizationName,
          role: activeMembership.role
        }
      });
    } catch (error) {
      if (error instanceof AuthError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
      }

      throw error;
    }
  };

  resendVerification = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const parsed = resendVerificationSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request body",
        issues: parsed.error.flatten()
      });
      return;
    }

    await this.authService.resendVerificationByEmail(
      parsed.data.email,
      this.getAppBaseUrl()
    );
    reply.send({
      success: true,
      message:
        "If an account with that email exists and is not verified, we sent a confirmation link."
    });
  };

  logout = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    await request.session.destroy();
    reply.send({ success: true });
  };

  me = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const sessionUser = request.session.user;
    if (!sessionUser) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    const context = await this.authService.getUserContext(
      sessionUser.id,
      sessionUser.activeOrganizationId
    );
    if (!context) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    request.session.user = {
      id: context.user.id,
      activeOrganizationId: context.activeOrganization.id
    };
    await request.session.save();

    reply.send({
      user: context.user,
      activeOrganization: context.activeOrganization,
      memberships: context.memberships
    });
  };

  switchOrganization = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const sessionUser = request.session.user;
    if (!sessionUser) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    const parsed = switchOrganizationSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request body",
        issues: parsed.error.flatten()
      });
      return;
    }

    const context = await this.authService.getUserContext(
      sessionUser.id,
      parsed.data.organizationId
    );
    if (!context || context.activeOrganization.id !== parsed.data.organizationId) {
      reply.code(403).send({ message: "You do not have access to this organization" });
      return;
    }

    request.session.user = {
      id: sessionUser.id,
      activeOrganizationId: parsed.data.organizationId
    };
    await request.session.save();

    reply.send({
      success: true,
      activeOrganization: context.activeOrganization
    });
  };

  googleStart = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = googleStartQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request query",
        issues: parsed.error.flatten()
      });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      reply.code(500).send({ message: "Google OAuth is not configured" });
      return;
    }

    const state = base64UrlEncode(randomBytes(32));
    const codeVerifier = base64UrlEncode(randomBytes(48));
    const codeChallenge = sha256Base64Url(codeVerifier);

    request.session.oauth = {
      ...(request.session.oauth || {}),
      google: {
        state,
        codeVerifier,
        redirectTo: parsed.data.redirectTo
      }
    };
    await request.session.save();

    // Note: for a future "BFF" approach, frontend can host this flow too.
    // For now the backend owns the callback and sets the session cookie.
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", codeChallenge);

    reply.redirect(url.toString());
  };

  googleCallback = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const parsed = googleCallbackQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({
        message: "Invalid request query",
        issues: parsed.error.flatten()
      });
      return;
    }

    const stored = request.session.oauth?.google;
    if (!stored?.state || !stored.codeVerifier) {
      reply.code(400).send({ message: "Missing OAuth session state. Please try again." });
      return;
    }
    if (stored.state !== parsed.data.state) {
      reply.code(400).send({ message: "Invalid OAuth state. Please try again." });
      return;
    }

    try {
      const identity = await this.googleStrategy.authenticate({
        code: parsed.data.code,
        state: parsed.data.state,
        codeVerifier: stored.codeVerifier
      });

      const user = await this.authService.findOrCreateUserFromGoogle(identity);
      const activeMembership = await this.authService.getActiveMembershipForUser(user.id);
      if (!activeMembership) {
        reply.code(403).send({ message: "User has no active organization membership" });
        return;
      }

      await this.authService.createUserSession(
        request,
        user,
        activeMembership.organizationId
      );

      if (request.session.oauth?.google) {
        delete request.session.oauth.google;
      }
      await request.session.save();

      const appBaseUrl = this.getAppBaseUrl().replace(/\/$/, "");
      const redirectPath = stored.redirectTo?.startsWith("/")
        ? stored.redirectTo
        : "/";
      reply.redirect(`${appBaseUrl}${redirectPath}`);
    } catch (error) {
      if (error instanceof AuthError) {
        reply.code(error.statusCode).send({ message: error.message });
        return;
      }
      throw error;
    }
  };

  private getAppBaseUrl(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
    );
  }
}
