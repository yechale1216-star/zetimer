-- Drop and recreate students table to match current registration form
-- This ensures the schema aligns with the form fields being submitted

-- Drop dependent tables first (attendance depends on students)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS attendance_reports CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Create students table matching the current registration form
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  grade VARCHAR(50),
  stream VARCHAR(50),
  section VARCHAR(50),
  gender VARCHAR(20),
  date_of_birth DATE,
  parent_name VARCHAR(255),
  parent_email VARCHAR(255),
  parent_phone VARCHAR(20),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_id)
);

-- Recreate attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  remarks TEXT,
  marked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_id, attendance_date)
);

-- Recreate attendance reports table
CREATE TABLE attendance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_days INTEGER,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  attendance_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_id, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_attendance_school_id ON attendance(school_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_reports_school_id ON attendance_reports(school_id);
CREATE INDEX idx_reports_student_id ON attendance_reports(student_id);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy for students
CREATE POLICY "Users can view students in their school"
  ON students FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

CREATE POLICY "Users can insert students in their school"
  ON students FOR INSERT
  WITH CHECK (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

CREATE POLICY "Users can update students in their school"
  ON students FOR UPDATE
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

-- RLS Policies for attendance
CREATE POLICY "Users can view attendance in their school"
  ON attendance FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

CREATE POLICY "Users can insert attendance in their school"
  ON attendance FOR INSERT
  WITH CHECK (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

-- RLS Policies for attendance_reports
CREATE POLICY "Users can view reports in their school"
  ON attendance_reports FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));
