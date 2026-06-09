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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsByParentPhone = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.bulkUpsertStudents = exports.generateStudentId = exports.createStudent = exports.getNextStudentId = exports.getAllStudents = void 0;
const db_1 = __importDefault(require("../config/db"));
const parentService = __importStar(require("./parent.service"));
// Map database relational model to flat frontend model
const mapStudentToFlat = (student) => {
    if (!student)
        return null;
    return {
        ...student,
        name: student.fullName, // map back to 'name' for frontend
        grade: student.grade?.name || '',
        section: student.section?.name || '',
        stream: student.stream?.name || null,
    };
};
const getAllStudents = async (schoolId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    const students = await db_1.default.student.findMany({
        where: { schoolId: schoolId },
        include: {
            grade: true,
            section: true,
            stream: true
        }
    });
    return students.map(mapStudentToFlat);
};
exports.getAllStudents = getAllStudents;
const getNextStudentId = async (schoolId) => {
    const idPrefix = 'STU';
    const latestStudent = await db_1.default.student.findFirst({
        where: {
            schoolId,
            student_id: { startsWith: idPrefix }
        },
        orderBy: { student_id: 'desc' },
        select: { student_id: true }
    });
    let nextSequence = 1;
    if (latestStudent && latestStudent.student_id) {
        const currentSequence = parseInt(latestStudent.student_id.substring(idPrefix.length), 10);
        if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
        }
    }
    return `${idPrefix}${nextSequence.toString().padStart(4, '0')}`;
};
exports.getNextStudentId = getNextStudentId;
const createStudent = async (data, schoolId) => {
    console.log(`[StudentService] createStudent called for schoolId: "${schoolId}"`);
    // Verify school exists
    const school = await db_1.default.school.findUnique({ where: { id: schoolId } });
    if (!school) {
        console.error(`[StudentService] School not found for ID: "${schoolId}"`);
        throw new Error('School context invalid - Please logout and login again (database was likely reset)');
    }
    let studentId = data.student_id;
    if (!studentId) {
        studentId = await (0, exports.getNextStudentId)(schoolId);
    }
    // Create or connect relations with schoolId scoping
    const newStudent = await db_1.default.student.create({
        data: {
            fullName: data.name,
            student_id: studentId,
            parent_email: data.parent_email || "",
            parent_phone: data.parent_phone || "",
            parent_name: data.parent_name || "",
            gender: data.gender,
            date_of_birth: data.date_of_birth,
            school: { connect: { id: schoolId } },
            grade: {
                connectOrCreate: {
                    where: { schoolId_name: { schoolId, name: data.grade } },
                    create: { name: data.grade, schoolId }
                }
            },
            section: {
                connectOrCreate: {
                    where: { schoolId_name: { schoolId, name: data.section } },
                    create: { name: data.section, schoolId }
                }
            },
            stream: data.stream ? {
                connectOrCreate: {
                    where: { schoolId_name: { schoolId, name: data.stream } },
                    create: { name: data.stream, schoolId }
                }
            } : undefined
        },
        include: {
            grade: true,
            section: true,
            stream: true
        }
    });
    // Handle Parent User Account creation or linking
    const parent = await parentService.findOrCreateParentByPhone(data.parent_phone, {
        name: data.parent_name,
        email: data.parent_email,
        password: data.parent_password,
        address: data.parent_address,
        schoolId: schoolId
    });
    await db_1.default.parentStudentLink.upsert({
        where: {
            parentId_studentId: {
                parentId: parent.id,
                studentId: newStudent.id
            }
        },
        update: {
            relationshipType: data.relationshipType || 'Guardian',
            schoolId: schoolId
        },
        create: {
            parentId: parent.id,
            studentId: newStudent.id,
            schoolId: schoolId,
            relationshipType: data.relationshipType || 'Guardian'
        }
    });
    return mapStudentToFlat(newStudent);
};
exports.createStudent = createStudent;
const generateStudentId = async (schoolId) => {
    return await (0, exports.getNextStudentId)(schoolId);
};
exports.generateStudentId = generateStudentId;
const bulkUpsertStudents = async (students, schoolId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    const results = { created: 0, updated: 0, errors: [] };
    // Generate a base sequence for auto-generated IDs to avoid collisions during the same bulk operation
    let autoGenSequenceOffset = 0;
    const idPrefix = 'STU';
    // Pre-calculate starting sequence if needed
    const latestStudent = await db_1.default.student.findFirst({
        where: {
            schoolId: schoolId,
            student_id: { startsWith: idPrefix }
        },
        orderBy: { student_id: 'desc' },
        select: { student_id: true }
    });
    let nextBaseSequence = 1;
    if (latestStudent && latestStudent.student_id) {
        const currentSequence = parseInt(latestStudent.student_id.substring(idPrefix.length), 10);
        if (!isNaN(currentSequence)) {
            nextBaseSequence = currentSequence + 1;
        }
    }
    // Process in sequence to ensure stability and proper parent linking across siblings
    for (let i = 0; i < students.length; i++) {
        const data = students[i];
        try {
            let studentId = data.student_id ? String(data.student_id).trim() : null;
            // Auto-generate ID if missing
            if (!studentId) {
                studentId = `${idPrefix}${(nextBaseSequence + autoGenSequenceOffset).toString().padStart(4, '0')}`;
                autoGenSequenceOffset++;
            }
            // Stream Validation (Ethiopian Standards)
            const gradeName = String(data.grade).trim();
            const gradeNum = parseInt(gradeName);
            if (!isNaN(gradeNum)) {
                if (gradeNum >= 11 && !data.stream) {
                    throw new Error(`Stream selection (Natural/Social Science) is required for Grade ${gradeName}`);
                }
                if (gradeNum <= 10 && data.stream) {
                    data.stream = null; // Enforce no stream for Grades 1-10
                }
            }
            // 1. Handle Relations (Grade, Section, Stream)
            const grade = await db_1.default.grade.upsert({
                where: { schoolId_name: { schoolId, name: data.grade } },
                update: {},
                create: { name: data.grade, schoolId }
            });
            const section = await db_1.default.section.upsert({
                where: { schoolId_name: { schoolId, name: data.section } },
                update: {},
                create: { name: data.section, schoolId }
            });
            let streamId = undefined;
            if (data.stream) {
                const stream = await db_1.default.stream.upsert({
                    where: { schoolId_name: { schoolId, name: data.stream } },
                    update: {},
                    create: { name: data.stream, schoolId }
                });
                streamId = stream.id;
            }
            const existingStudent = await db_1.default.student.findUnique({
                where: { student_id_schoolId: { student_id: studentId, schoolId } }
            });
            // 2. Upsert Student
            const student = await db_1.default.student.upsert({
                where: { student_id_schoolId: { student_id: studentId, schoolId } },
                update: {
                    fullName: data.name,
                    parent_email: data.parent_email || "",
                    parent_phone: data.parent_phone || "",
                    parent_name: data.parent_name || "",
                    gender: data.gender || null,
                    date_of_birth: data.date_of_birth || null,
                    address: data.address || null,
                    gradeId: grade.id,
                    sectionId: section.id,
                    streamId: streamId || null
                },
                create: {
                    student_id: studentId,
                    fullName: data.name,
                    parent_email: data.parent_email || "",
                    parent_phone: data.parent_phone || "",
                    parent_name: data.parent_name || "",
                    gender: data.gender || null,
                    date_of_birth: data.date_of_birth || null,
                    address: data.address || null,
                    schoolId: schoolId,
                    gradeId: grade.id,
                    sectionId: section.id,
                    streamId: streamId || null
                }
            });
            if (existingStudent) {
                results.updated++;
            }
            else {
                results.created++;
            }
            // 3. Handle Parent Linking
            if (data.parent_phone) {
                const parent = await parentService.findOrCreateParentByPhone(data.parent_phone, {
                    name: data.parent_name,
                    email: data.parent_email,
                    password: data.parent_password,
                    address: data.parent_address,
                    schoolId: schoolId
                });
                await db_1.default.parentStudentLink.upsert({
                    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
                    update: {
                        relationshipType: data.relationshipType || 'Guardian',
                        schoolId: schoolId
                    },
                    create: {
                        parentId: parent.id,
                        studentId: student.id,
                        schoolId: schoolId,
                        relationshipType: data.relationshipType || 'Guardian'
                    }
                });
            }
        }
        catch (err) {
            results.errors.push(`Row ${i + 1} (${data.name}): ${err.message}`);
        }
    }
    return results;
};
exports.bulkUpsertStudents = bulkUpsertStudents;
const getStudentById = async (id, schoolId) => {
    const student = await db_1.default.student.findFirst({
        where: { id, schoolId },
        include: {
            attendance: true,
            grade: true,
            section: true,
            stream: true
        },
    });
    return mapStudentToFlat(student);
};
exports.getStudentById = getStudentById;
const updateStudent = async (id, data, schoolId) => {
    const updateData = {};
    if (data.name)
        updateData.fullName = data.name;
    if (data.student_id)
        updateData.student_id = data.student_id;
    if (data.parent_email)
        updateData.parent_email = data.parent_email;
    if (data.parent_phone)
        updateData.parent_phone = data.parent_phone;
    if (data.parent_name)
        updateData.parent_name = data.parent_name;
    if (data.gender)
        updateData.gender = data.gender;
    if (data.date_of_birth)
        updateData.date_of_birth = data.date_of_birth;
    if (data.grade) {
        updateData.grade = {
            connectOrCreate: {
                where: { schoolId_name: { schoolId, name: data.grade } },
                create: { name: data.grade, schoolId }
            }
        };
    }
    if (data.section) {
        updateData.section = {
            connectOrCreate: {
                where: { schoolId_name: { schoolId, name: data.section } },
                create: { name: data.section, schoolId }
            }
        };
    }
    if (data.stream) {
        updateData.stream = {
            connectOrCreate: {
                where: { schoolId_name: { schoolId, name: data.stream } },
                create: { name: data.stream, schoolId }
            }
        };
    }
    const updatedStudent = await db_1.default.student.update({
        where: { id, schoolId },
        data: updateData,
        include: {
            grade: true,
            section: true,
            stream: true
        }
    });
    return mapStudentToFlat(updatedStudent);
};
exports.updateStudent = updateStudent;
const deleteStudent = async (id, schoolId) => {
    return await db_1.default.student.delete({
        where: { id, schoolId }
    });
};
exports.deleteStudent = deleteStudent;
const getStudentsByParentPhone = async (parentPhone, schoolId) => {
    const students = await db_1.default.student.findMany({
        where: { parent_phone: parentPhone, schoolId },
        include: {
            grade: true,
            section: true,
            stream: true,
            attendance: {
                orderBy: { date: 'desc' }
            }
        }
    });
    return students.map((student) => ({
        ...mapStudentToFlat(student),
        attendance: student.attendance
    }));
};
exports.getStudentsByParentPhone = getStudentsByParentPhone;
