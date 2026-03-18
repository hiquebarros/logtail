"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const config_1 = require("./config");
const dbConfig = (0, config_1.getDbConfig)();
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: dbConfig.url
        }
    }
});
