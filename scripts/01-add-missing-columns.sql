-- Add missing columns to teacher_assignments table
ALTER TABLE teacher_assignments 
ADD COLUMN IF NOT EXISTS class_id UUID;

-- Add missing columns to students table  
ALTER TABLE students
ADD COLUMN IF NOT EXISTS stream VARCHAR(50),
ADD COLUMN IF NOT EXISTS grade VARCHAR(50);

-- Add missing columns to teachers table for subject tracking
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS subject VARCHAR(255);

-- Update email settings to track school_id properly
ALTER TABLE email_settings
ADD COLUMN IF NOT EXISTS subject VARCHAR(255);

-- Add enrollment/roll number relationship column if needed
ALTER TABLE students
ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(50);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_id ON teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_id ON teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_stream ON students(stream);
