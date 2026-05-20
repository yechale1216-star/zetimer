-- Make stream column nullable in teacher_assignments table
-- Stream should only be required for grades 11 and 12

ALTER TABLE teacher_assignments
ALTER COLUMN stream DROP NOT NULL;

-- Add a comment to explain the constraint
COMMENT ON COLUMN teacher_assignments.stream IS 'Optional for grades 1-10, required for grades 11-12';
