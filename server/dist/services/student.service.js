"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentsByParentPhone = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.createStudent = exports.getAllStudents = void 0;
const db_1 = __importDefault(require("../config/db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Helper to get or create a default school
const getDefaultSchoolId = async () => {
    let school = await db_1.default.school.findFirst();
    if (!school) {
        school = await db_1.default.school.create({
            data: { name: 'Main School' }
        });
    }
    return school.id;
};
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
    const defaultSchoolId = await getDefaultSchoolId();
    const targetSchoolId = schoolId || defaultSchoolId;
    const students = await db_1.default.student.findMany({
        where: { schoolId: targetSchoolId },
        include: {
            grade: true,
            section: true,
            stream: true
        }
    });
    return students.map(mapStudentToFlat);
};
exports.getAllStudents = getAllStudents;
const createStudent = async (data, schoolIdFromHeader) => {
    const defaultSchoolId = await getDefaultSchoolId();
    const schoolId = schoolIdFromHeader || data.schoolId || defaultSchoolId;
    // Make sure school exists in Postgres to prevent constraint errors
    let school = await db_1.default.school.findUnique({ where: { id: schoolId } });
    if (!school) {
        school = await db_1.default.school.create({
            data: {
                id: schoolId,
                name: data.schoolName || 'PostgreSQL School'
            }
        });
    }
    // Create or connect relations
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
                    where: { name: data.grade },
                    create: { name: data.grade }
                }
            },
            section: {
                connectOrCreate: {
                    where: { name: data.section },
                    create: { name: data.section }
                }
            },
            stream: data.stream ? {
                connectOrCreate: {
                    where: { name: data.stream },
                    create: { name: data.stream }
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
        // Link existing parent
        await db_1.default.parentStudentLink.create({
            data: {
                parentId: data.existingParentId,
                studentId: newStudent.id
            }
        });
    }
    else if (data.parent_phone && data.parent_password) {
        // Create new parent
        const cleanPhone = data.parent_phone.replace(/\s+/g, '');
        const hashedPassword = await bcryptjs_1.default.hash(data.parent_password, 10);
        const parentEmail = data.parent_email || `parent-${cleanPhone}@zetime.com`;
        const user = await db_1.default.user.upsert({
            where: { email: parentEmail }, // Assuming email is unique constraint
            update: {
                password_hash: hashedPassword,
                full_name: data.parent_name || 'Parent',
                phone: cleanPhone,
                role: 'parent',
                school_id: schoolId
            },
            create: {
                email: parentEmail,
                password_hash: hashedPassword,
                full_name: data.parent_name || 'Parent',
                phone: cleanPhone,
                role: 'parent',
                school_id: schoolId,
                is_active: true
            }
        });
        await db_1.default.parentStudentLink.create({
            data: {
                parentId: user.id,
                studentId: newStudent.id
            }
        });
    }
    return mapStudentToFlat(newStudent);
};
exports.createStudent = createStudent;
const getStudentById = async (id) => {
    const student = await db_1.default.student.findUnique({
        where: { id },
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
const updateStudent = async (id, data) => {
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
                where: { name: data.grade },
                create: { name: data.grade }
            }
        };
    }
    if (data.section) {
        updateData.section = {
            connectOrCreate: {
                where: { name: data.section },
                create: { name: data.section }
            }
        };
    }
    if (data.stream) {
        updateData.stream = {
            connectOrCreate: {
                where: { name: data.stream },
                create: { name: data.stream }
            }
        };
    }
    const updatedStudent = await db_1.default.student.update({
        where: { id },
        data: updateData,
        include: {
            grade: true,
            section: true,
            stream: true
        }
    });
    // Handle Parent User Account update
    if (data.parent_phone && data.parent_password) {
        const cleanPhone = data.parent_phone.replace(/\s+/g, '');
        const hashedPassword = await bcryptjs_1.default.hash(data.parent_password, 10);
        const parentEmail = data.parent_email || `parent-${cleanPhone}@zetime.com`;
        // Try to find existing parent by phone first
        const existingParent = await db_1.default.user.findFirst({
            where: { phone: cleanPhone, role: 'parent' }
        });
        if (existingParent) {
            await db_1.default.user.update({
                where: { id: existingParent.id },
                data: {
                    password_hash: hashedPassword,
                    full_name: data.parent_name || existingParent.full_name,
                    email: parentEmail
                }
            });
        }
        else {
            // If not exists, create
            await db_1.default.user.upsert({
                where: { email: parentEmail },
                update: {
                    password_hash: hashedPassword,
                    full_name: data.parent_name || 'Parent',
                    phone: cleanPhone,
                    role: 'parent',
                },
                create: {
                    email: parentEmail,
                    password_hash: hashedPassword,
                    full_name: data.parent_name || 'Parent',
                    phone: cleanPhone,
                    role: 'parent',
                    is_active: true
                }
            });
        }
    }
    return mapStudentToFlat(updatedStudent);
};
exports.updateStudent = updateStudent;
const deleteStudent = async (id) => {
    return await db_1.default.student.delete({ where: { id } });
};
exports.deleteStudent = deleteStudent;
const getStudentsByParentPhone = async (parentPhone) => {
    const students = await db_1.default.student.findMany({
        where: { parent_phone: parentPhone },
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
