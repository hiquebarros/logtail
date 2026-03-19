"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_schemas_1 = require("./auth.schemas");
const auth_service_1 = require("./auth.service");
class AuthController {
    constructor(authService, localStrategy) {
        this.authService = authService;
        this.localStrategy = localStrategy;
        this.login = async (request, reply) => {
            const parsed = auth_schemas_1.loginSchema.safeParse(request.body);
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
            }
            catch (error) {
                if (error instanceof auth_service_1.AuthError) {
                    reply.code(error.statusCode).send({ message: error.message });
                    return;
                }
                throw error;
            }
        };
        this.logout = async (request, reply) => {
            await request.session.destroy();
            reply.send({ success: true });
        };
        this.me = async (request, reply) => {
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
}
exports.AuthController = AuthController;
