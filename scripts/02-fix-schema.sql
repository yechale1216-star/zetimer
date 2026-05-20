-- Drop existing attendance table and recreate with correct schema
DROP TABLE IF EXISTS attendance CASCADE;

-- Create the corrected attendance_records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'leave')),
  remarks TEXT,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, student_id, attendance_date)
);

-- Add missing columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS roll_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_number VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(20);

-- Add missing columns to users table for teacher fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;

-- Create alias for attendance_records table for API compatibility
CREATE OR REPLACE VIEW attendance AS SELECT * FROM attendance_records;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON attendance_records(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_school_student_date ON attendance_records(school_id, student_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_assignments(class_id);
