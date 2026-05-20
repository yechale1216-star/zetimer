-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'teacher', -- 'admin', 'teacher', 'staff'
  school_id UUID REFERENCES schools(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  admin_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  section VARCHAR(50),
  class_teacher_id UUID REFERENCES users(id),
  capacity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name, grade, section)
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(10),
  parent_name VARCHAR(255),
  parent_phone VARCHAR(20),
  parent_email VARCHAR(255),
  address TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'transferred'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, class_id, roll_number)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'present', 'absent', 'leave', 'late'
  remarks TEXT,
  marked_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_id, attendance_date)
);

-- Create attendance reports table
CREATE TABLE IF NOT EXISTS attendance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
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

-- Create email settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  smtp_host VARCHAR(255),
  smtp_port INTEGER,
  smtp_user VARCHAR(255),
  smtp_password VARCHAR(255),
  from_email VARCHAR(255),
  send_daily_reports BOOLEAN DEFAULT false,
  send_weekly_reports BOOLEAN DEFAULT false,
  low_attendance_threshold INTEGER DEFAULT 75,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id)
);

-- Create indexes for performance
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_attendance_school_id ON attendance(school_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_reports_school_id ON attendance_reports(school_id);
CREATE INDEX idx_reports_student_id ON attendance_reports(student_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools (users can only see their school)
CREATE POLICY "Users can view their own school"
  ON schools FOR SELECT
  USING (auth.uid()::uuid = admin_id OR admin_id IN (SELECT id FROM users WHERE school_id = schools.id AND auth.uid()::uuid = users.id));

-- RLS Policies for users (users can only see users in their school)
CREATE POLICY "Users can view school members"
  ON users FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

-- RLS Policies for classes
CREATE POLICY "Users can view classes in their school"
  ON classes FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

-- RLS Policies for students
CREATE POLICY "Users can view students in their school"
  ON students FOR SELECT
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

-- RLS Policies for email_settings
CREATE POLICY "Users can view email settings for their school"
  ON email_settings FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()::uuid));

CREATE POLICY "Only admins can update email settings"
  ON email_settings FOR UPDATE
  USING ((SELECT role FROM users WHERE id = auth.uid()::uuid) = 'admin');
