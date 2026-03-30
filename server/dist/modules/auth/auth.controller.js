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
                const activeMembership = await this.authService.getActiveMembershipForUser(user.id);
                if (!activeMembership) {
                    reply.code(403).send({ message: "User has no active organization membership" });
                    return;
                }
                await this.authService.createUserSession(request, user, activeMembership.organizationId);
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
            }
            catch (error) {
                if (error instanceof auth_service_1.AuthError) {
                    reply.code(error.statusCode).send({ message: error.message });
                    return;
                }
                throw error;
            }
        };
        this.register = async (request, reply) => {
            const parsed = auth_schemas_1.registerSchema.safeParse(request.body);
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
            }
            catch (error) {
                if (error instanceof auth_service_1.AuthError) {
                    reply.code(error.statusCode).send({ message: error.message });
                    return;
                }
                throw error;
            }
        };
        this.verifyEmail = async (request, reply) => {
            const parsed = auth_schemas_1.verifyEmailSchema.safeParse(request.body);
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
                await this.authService.createUserSession(request, user, activeMembership.organizationId);
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
            }
            catch (error) {
                if (error instanceof auth_service_1.AuthError) {
                    reply.code(error.statusCode).send({ message: error.message });
                    return;
                }
                throw error;
            }
        };
        this.resendVerification = async (request, reply) => {
            const parsed = auth_schemas_1.resendVerificationSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({
                    message: "Invalid request body",
                    issues: parsed.error.flatten()
                });
                return;
            }
            await this.authService.resendVerificationByEmail(parsed.data.email, this.getAppBaseUrl());
            reply.send({
                success: true,
                message: "If an account with that email exists and is not verified, we sent a confirmation link."
            });
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
            const context = await this.authService.getUserContext(sessionUser.id, sessionUser.activeOrganizationId);
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
        this.switchOrganization = async (request, reply) => {
            const sessionUser = request.session.user;
            if (!sessionUser) {
                reply.code(401).send({ message: "Unauthorized" });
                return;
            }
            const parsed = auth_schemas_1.switchOrganizationSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({
                    message: "Invalid request body",
                    issues: parsed.error.flatten()
                });
                return;
            }
            const context = await this.authService.getUserContext(sessionUser.id, parsed.data.organizationId);
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
    getAppBaseUrl() {
        return (process.env.FRONTEND_URL ||
            process.env.CLIENT_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.APP_URL ||
            "http://localhost:3000");
    }
}
exports.AuthController = AuthController;
