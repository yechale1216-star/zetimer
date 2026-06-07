"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
const PORT = Number(process.env.PORT) || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
// Initialize Socket.IO
(0, socket_1.initSocket)(httpServer);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
