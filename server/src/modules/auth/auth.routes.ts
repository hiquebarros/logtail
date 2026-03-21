import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LocalStrategy } from "../../strategies/local.strategy";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const authService = new AuthService();
  const localStrategy = new LocalStrategy(authService);
  const authController = new AuthController(authService, localStrategy);

  app.register(async (authScope) => {
    authScope.post("/auth/login", authController.login);
    authScope.post("/auth/register", authController.register);
    authScope.post(
      "/auth/logout",
      { preHandler: [authScope.authenticate] },
      authController.logout
    );
    authScope.post(
      "/auth/switch-organization",
      { preHandler: [authScope.authenticate] },
      authController.switchOrganization
    );
    authScope.get("/auth/me", { preHandler: [authScope.authenticate] }, authController.me);
  });
}
