import { FastifyReply, FastifyRequest } from "fastify";
import { loginSchema } from "./auth.schemas";
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
      await this.authService.createUserSession(request, user);

      reply.send({
        success: true,
        user: {
          id: user.id,
          email: user.email
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

    const user = await this.authService.findUserById(sessionUser.id);
    if (!user) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    reply.send({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  };
}
