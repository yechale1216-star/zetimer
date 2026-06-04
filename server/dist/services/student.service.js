"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsByParentPhone = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.bulkUpsertStudents = exports.createStudent = exports.getAllStudents = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
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
const createStudent = async (data, schoolId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    // Create or connect relations with schoolId scoping
    const newStudent = await db_1.default.student.create({
        data: {
            fullName: data.name,
            student_id: data.student_id,
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
    if (data.existingParentId) {
        await db_1.default.parentStudentLink.upsert({
            where: {
                parentId_studentId: {
                    parentId: data.existingParentId,
                    studentId: newStudent.id
                }
            },
            update: {
                relationshipType: data.relationshipType || 'Guardian',
                schoolId: schoolId
            },
            create: {
                parentId: data.existingParentId,
                studentId: newStudent.id,
                schoolId: schoolId,
                relationshipType: data.relationshipType || 'Guardian'
            }
        });
    }
    else if (data.parent_phone && data.parent_password) {
        const cleanPhone = data.parent_phone.replace(/\s+/g, '');
        const hashedPassword = await bcryptjs_1.default.hash(data.parent_password, 10);
        // Use clear pattern for email if not provided to maintain uniqueness
        const parentEmail = data.parent_email || `parent-${cleanPhone}-${schoolId}@zetime.com`;
        const user = await db_1.default.user.upsert({
            where: { email: parentEmail },
            update: {
                password_hash: hashedPassword,
                full_name: data.parent_name || 'Parent',
                phone: cleanPhone,
                role: 'parent',
                schoolId: schoolId,
                address: data.parent_address || null
            },
            create: {
                email: parentEmail,
                password_hash: hashedPassword,
                full_name: data.parent_name || 'Parent',
                phone: cleanPhone,
                role: 'parent',
                schoolId: schoolId,
                address: data.parent_address || null,
                is_active: true
            }
        });
        await db_1.default.parentStudentLink.create({
            data: {
                parentId: user.id,
                studentId: newStudent.id,
                schoolId: schoolId,
                relationshipType: data.relationshipType || 'Guardian'
            }
        });
    }
    return mapStudentToFlat(newStudent);
};
exports.createStudent = createStudent;
const bulkUpsertStudents = async (students, schoolId) => {
    if (!schoolId)
        throw new Error('School ID is required');
    const results = {
        created: 0,
        updated: 0,
        errors: []
    };
    // Process in sequence to ensure stability and proper parent linking across siblings
    for (let i = 0; i < students.length; i++) {
        const data = students[i];
        try {
            const studentId = String(data.student_id);
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
                const cleanPhone = data.parent_phone.replace(/\s+/g, '');
                const parentEmail = data.parent_email || `parent-${cleanPhone}-${schoolId}@zetime.com`;
                const tempPassword = data.parent_password || "demo123456";
                const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 10);
                const parent = await db_1.default.user.upsert({
                    where: { email: parentEmail },
                    update: {
                        full_name: data.parent_name || 'Parent',
                        phone: cleanPhone,
                        role: 'parent',
                        schoolId: schoolId,
                        address: data.parent_address || null
                    },
                    create: {
                        email: parentEmail,
                        password_hash: hashedPassword,
                        full_name: data.parent_name || 'Parent',
                        phone: cleanPhone,
                        role: 'parent',
                        schoolId: schoolId,
                        address: data.parent_address || null,
                        is_active: true
                    }
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
