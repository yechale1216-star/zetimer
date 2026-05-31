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
exports.exportAttendance = exports.getDrillDownStats = exports.getAttendanceTrends = exports.getGradeStats = exports.getAttendanceSummary = void 0;
const analyticsService = __importStar(require("../services/attendance-analytics.service"));
const getAttendanceSummary = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const stats = await analyticsService.getAttendanceSummary(schoolId, req.query);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceSummary = getAttendanceSummary;
const getGradeStats = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const stats = await analyticsService.getGradeStats(schoolId, req.query);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getGradeStats = getGradeStats;
const getAttendanceTrends = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const trends = await analyticsService.getAttendanceTrends(schoolId, req.query);
        res.status(200).json({ success: true, data: trends });
    }
    catch (error) {
        next(error);
    }
};
exports.getAttendanceTrends = getAttendanceTrends;
const getDrillDownStats = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const stats = await analyticsService.getDrillDownStats(schoolId, req.params.gradeId, req.query);
        res.status(200).json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getDrillDownStats = getDrillDownStats;
const exportAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        // For now, return a raw list or summary that can be converted to CSV on frontend
        const data = await analyticsService.getAttendanceTrends(schoolId, req.query);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
};
exports.exportAttendance = exportAttendance;
