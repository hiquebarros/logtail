import { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema, registerSchema, switchOrganizationSchema } from "./auth.schemas";
import { AuthError, AuthService } from "./auth.service";
import { LocalStrategy } from "../../strategies/local.strategy";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly localStrategy: LocalStrategy
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
      await this.authService.createUserSession(
        request,
        created.user,
        created.organizationId
      );

      reply.code(201).send({
        success: true,
        user: {
          id: created.user.id,
          email: created.user.email,
          name: created.user.name
        },
        activeOrganization: {
          id: created.organizationId
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
}
