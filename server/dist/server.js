"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
const redis_1 = require("./redis");
const db_1 = __importDefault(require("./config/db"));
const PORT = Number(process.env.PORT) || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
// Prevent hanging requests and gateway races behind reverse proxies
httpServer.requestTimeout = 30000; // 30s max request handling time
httpServer.headersTimeout = 31000; // Must be greater than requestTimeout
httpServer.keepAliveTimeout = 65000; // > 60s for Cloudflare/ALB/Render keep-alive
// Drop the unique constraint on School.name if it still exists (schema migration workaround)
async function applyStartupMigrations() {
    try {
        await db_1.default.$executeRaw `ALTER TABLE "School" DROP CONSTRAINT IF EXISTS "School_name_key"`;
        console.log('[migration] School name uniqueness constraint removed (or was already absent).');
    }
    catch (e) {
        console.warn('[migration] Could not remove School_name_key constraint:', e);
    }
}
async function start() {
    // 1. Connect Redis (gracefully falls back if unavailable — socket still works on single instance)
    await (0, redis_1.connectRedis)();
    // 2. Initialize Socket.IO (with Redis adapter already attached inside initSocket)
    (0, socket_1.initSocket)(httpServer);
    // 3. Apply startup DB migrations
    await applyStartupMigrations();
    // 4. Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error('[startup] Fatal error:', err);
    process.exit(1);
});
