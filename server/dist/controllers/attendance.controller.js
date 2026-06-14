"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkMarkAttendance = exports.getAttendanceByStudent = exports.getAttendance = exports.markAttendance = void 0;
const attendanceService = __importStar(require("../services/attendance.service"));
const markAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(401).json({ success: false, message: 'School ID context missing' });
        }
        const result = await attendanceService.markAttendance(req.body, schoolId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.markAttendance = markAttendance;
const getAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(401).json({ success: false, message: 'School ID context missing' });
        }
        const filters = {
            ...req.query,
            schoolId // Override any incoming schoolId in query with the authenticated one
        };
        const result = await attendanceService.getAttendance(filters, schoolId);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendance = getAttendance;
const getAttendanceByStudent = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(401).json({ success: false, message: 'School ID context missing' });
        }
        const result = await attendanceService.getAttendanceByStudent(req.params.studentId, schoolId, req.query);
        res.status(200).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceByStudent = getAttendanceByStudent;
const bulkMarkAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId) {
            return res.status(401).json({ success: false, message: 'School ID context missing' });
        }
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'Records must be an array' });
        }
        const results = await Promise.all(records.map(record => attendanceService.markAttendance(record, schoolId)));
        res.status(200).json({ success: true, data: results });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkMarkAttendance = bulkMarkAttendance;
