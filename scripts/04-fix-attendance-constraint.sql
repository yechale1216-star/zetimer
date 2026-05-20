-- Add unique constraint to attendance_records if it doesn't exist
ALTER TABLE attendance_records
ADD CONSTRAINT unique_student_attendance_date UNIQUE (student_id, attendance_date);
