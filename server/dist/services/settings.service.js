"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const db_1 = __importDefault(require("../config/db"));
const DEFAULT_SETTINGS = {
    school_name: '',
    school_phone: '',
    school_address: '',
    academic_year: new Date().getFullYear().toString(),
    attendance_mode: 'session_based',
    attendance_ui_type: 'card_based',
    attendance_threshold: 75,
    allow_late_mark: true,
    email_notifications: true,
    sms_notifications: false,
    notification_time: '16:00',
    school_logo: '',
};
const getSettings = async (schoolId) => {
    let settings = await db_1.default.schoolSettings.findUnique({ where: { schoolId: schoolId } });
    if (!settings) {
        // Auto-create defaults on first access
        settings = await db_1.default.schoolSettings.create({
            data: { ...DEFAULT_SETTINGS, schoolId: schoolId },
        });
    }
    return settings;
};
exports.getSettings = getSettings;
const updateSettings = async (schoolId, data) => {
    return await db_1.default.schoolSettings.upsert({
        where: { schoolId: schoolId },
        create: { ...DEFAULT_SETTINGS, ...data, schoolId: schoolId },
        update: data,
    });
};
exports.updateSettings = updateSettings;
