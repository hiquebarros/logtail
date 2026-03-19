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
    authScope.post("/auth/logout", authController.logout);
    authScope.get("/auth/me", { preHandler: [authScope.authenticate] }, authController.me);
  });
}
