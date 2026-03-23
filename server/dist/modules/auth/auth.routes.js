"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthRoutes = registerAuthRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const local_strategy_1 = require("../../strategies/local.strategy");
async function registerAuthRoutes(app) {
    const authService = new auth_service_1.AuthService();
    const localStrategy = new local_strategy_1.LocalStrategy(authService);
    const authController = new auth_controller_1.AuthController(authService, localStrategy);
    app.register(async (authScope) => {
        authScope.post("/auth/login", authController.login);
        authScope.post("/auth/register", authController.register);
        authScope.post("/auth/logout", { preHandler: [authScope.authenticate] }, authController.logout);
        authScope.post("/auth/switch-organization", { preHandler: [authScope.authenticate] }, authController.switchOrganization);
        authScope.get("/auth/me", { preHandler: [authScope.authenticate] }, authController.me);
    });
}
