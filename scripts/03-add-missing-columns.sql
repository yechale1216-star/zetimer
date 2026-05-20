-- Add missing columns to students table to match form fields
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS grade VARCHAR(50),
ADD COLUMN IF NOT EXISTS stream VARCHAR(100),
ADD COLUMN IF NOT EXISTS section VARCHAR(50),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add missing columns to teachers table to match form fields
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_section ON students(section);
CREATE INDEX IF NOT EXISTS idx_students_stream ON students(stream);
