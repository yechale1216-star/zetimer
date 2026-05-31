"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchoolId = generateSchoolId;
const db_1 = __importDefault(require("../config/db"));
/**
 * Generates a unique School ID in the format SCH-XXXX (e.g., SCH-0001).
 */
async function generateSchoolId() {
    const lastSchool = await db_1.default.school.findFirst({
        where: {
            schoolId: {
                startsWith: 'SCH-',
            },
        },
        orderBy: {
            schoolId: 'desc',
        },
    });
    let nextNumber = 1;
    if (lastSchool && lastSchool.schoolId) {
        const match = lastSchool.schoolId.match(/SCH-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    return `SCH-${nextNumber.toString().padStart(4, '0')}`;
}
