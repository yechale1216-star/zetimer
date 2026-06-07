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
const express_1 = require("express");
const schoolService = __importStar(require("../services/school.service"));
const tenant_middleware_1 = require("../middleware/tenant.middleware");
const router = (0, express_1.Router)();
// Create or Update a school
router.post('/', async (req, res, next) => {
    try {
        const { id, name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'School name is required' });
        }
        let school;
        if (id) {
            // Check if school exists
            const existing = await schoolService.getSchoolById(id);
            if (existing) {
                school = await schoolService.updateSchool(id, { name });
            }
            else {
                school = await schoolService.createSchool({ id, name });
            }
        }
        else {
            school = await schoolService.createSchool({ name });
        }
        res.status(200).json({ success: true, data: {
                id: school.id,
                schoolId: school.schoolId,
                name: school.name,
                subscriptionStatus: school.subscriptionStatus
            } });
    }
    catch (error) {
        next(error);
    }
});
// Get school by ID (UUID or SCH-XXXX)
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        let school;
        if (id.startsWith('SCH-')) {
            school = await schoolService.getSchoolByCustomId(id);
        }
        else {
            school = await schoolService.getSchoolById(id);
        }
        if (!school)
            return res.status(404).json({ success: false, message: 'School not found' });
        res.status(200).json({ success: true, data: school });
    }
    catch (error) {
        next(error);
    }
});
// Get all schools (Super Admin only)
router.get('/', (0, tenant_middleware_1.authorize)(['super_admin']), async (req, res, next) => {
    try {
        const schools = await schoolService.getAllSchools();
        res.status(200).json({ success: true, data: schools });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
