-- Make class_id nullable in students table to allow student creation without class assignment
ALTER TABLE students
ALTER COLUMN class_id DROP NOT NULL;
