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
exports.getAttendanceByStudent = exports.getAttendance = exports.bulkMarkAttendance = exports.markAttendance = void 0;
const attendanceService = __importStar(require("../services/attendance.service"));
const markAttendance = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'];
        const attendance = await attendanceService.markAttendance({ ...req.body, schoolId });
        res.status(201).json({ success: true, data: attendance });
    }
    catch (error) {
        next(error);
    }
};
exports.markAttendance = markAttendance;
const bulkMarkAttendance = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'];
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'Records must be an array' });
        }
        const results = await Promise.all(records.map(record => attendanceService.markAttendance({ ...record, schoolId })));
        res.status(201).json({ success: true, data: results });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkMarkAttendance = bulkMarkAttendance;
const getAttendance = async (req, res, next) => {
    try {
        const schoolId = req.headers['x-school-id'];
        const { studentId, date, session, grade, section, startDate, endDate } = req.query;
        const attendance = await attendanceService.getAttendance({
            studentId, date, session, grade, section, startDate, endDate, schoolId
        });
        res.status(200).json({ success: true, data: attendance });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendance = getAttendance;
const getAttendanceByStudent = async (req, res, next) => {
    try {
        const attendance = await attendanceService.getAttendanceByStudent(req.params.studentId);
        res.status(200).json({ success: true, data: attendance });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceByStudent = getAttendanceByStudent;
