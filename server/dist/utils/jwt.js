"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.getJwtSecret = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('[SecurityError] JWT_SECRET environment variable is missing in production!');
        }
        return 'zetime-secret-key-2024-secure-and-long-enough';
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, (0, exports.getJwtSecret)(), { expiresIn: '30d' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, (0, exports.getJwtSecret)());
};
exports.verifyToken = verifyToken;
