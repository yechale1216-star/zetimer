"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
const db_1 = __importDefault(require("./config/db"));
const PORT = Number(process.env.PORT) || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
// Initialize Socket.IO
(0, socket_1.initSocket)(httpServer);
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
applyStartupMigrations().then(() => {
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
