"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const school_routes_1 = __importDefault(require("./routes/school.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const assignment_routes_1 = __importDefault(require("./routes/assignment.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const parent_routes_1 = __importDefault(require("./routes/parent.routes"));
const attendance_analytics_routes_1 = __importDefault(require("./routes/attendance-analytics.routes"));
const message_routes_1 = __importDefault(require("./routes/message.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const tenant_middleware_1 = require("./middleware/tenant.middleware");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Health check and Auth (Public)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
app.use('/api/auth', auth_routes_1.default);
// Apply Tenant Isolation Middleware to all other API routes
app.use('/api', tenant_middleware_1.tenantMiddleware);
// Routes
app.use('/api/students', student_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/api/schools', school_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/assignments', assignment_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/parent', parent_routes_1.default);
app.use('/api/attendance-analytics', attendance_analytics_routes_1.default);
app.use('/api/messages', message_routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Prisma Error Handling
    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'A record with this unique value already exists.',
            details: err.meta,
        });
    }
    if (err.code === 'P2025') {
        return res.status(404).json({
            success: false,
            message: 'Record not found.',
        });
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});
exports.default = app;
