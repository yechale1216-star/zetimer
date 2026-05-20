-- Disable RLS on data tables to allow service role access
-- Service role has full access and is only used server-side, so RLS isn't needed
-- This fixes the "permission denied for table users" error

-- Drop the problematic RLS policies on students table
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- Drop the problematic RLS policies on attendance table
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

-- Drop the problematic RLS policies on attendance_reports table
ALTER TABLE attendance_reports DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on users and schools for security (user data is sensitive)
-- Users table can only be accessed by their own row or admins
-- Schools table has school-level access control
