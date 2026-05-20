"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../config/db"));
const router = (0, express_1.Router)();
// Create or ensure a school exists (called on admin signup)
router.post('/', async (req, res, next) => {
    try {
        const { id, name, email, phone, code, address } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'School name is required' });
        }
        // If an ID is provided, upsert with that exact ID so localStorage and Postgres stay in sync
        let school;
        if (id) {
            school = await db_1.default.school.upsert({
                where: { id },
                create: { id, name },
                update: { name },
            });
        }
        else {
            // Try to find by name first
            school = await db_1.default.school.findFirst({ where: { name } });
            if (!school) {
                school = await db_1.default.school.create({ data: { name } });
            }
        }
        res.status(201).json({ success: true, data: { id: school.id, name: school.name } });
    }
    catch (error) {
        next(error);
    }
});
// Get school by ID
router.get('/:id', async (req, res, next) => {
    try {
        const school = await db_1.default.school.findUnique({ where: { id: req.params.id } });
        if (!school)
            return res.status(404).json({ success: false, message: 'School not found' });
        res.status(200).json({ success: true, data: school });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
