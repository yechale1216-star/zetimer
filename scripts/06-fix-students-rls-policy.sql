-- Drop existing RLS policies on students table
DROP POLICY IF EXISTS "Users can insert students in their school" ON students;
DROP POLICY IF EXISTS "Users can update students in their school" ON students;
DROP POLICY IF EXISTS "Users can view students in their school" ON students;

-- Create new RLS policies that allow service role and authenticated users
-- Policy for SELECT - users can view students in their school
CREATE POLICY "Users can view students in their school" ON students
  FOR SELECT
  USING (
    -- Allow service role (bypass RLS)
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.uid() = id AND email LIKE '%@%'
    )
    OR
    -- Allow authenticated users to see students in their school
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- Policy for INSERT - allow service role and users in the school
CREATE POLICY "Users can insert students in their school" ON students
  FOR INSERT
  WITH CHECK (
    -- Allow service role (bypass RLS)
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.uid() = id AND email LIKE '%@%'
    )
    OR
    -- Allow authenticated users to insert students in their school
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );

-- Policy for UPDATE - allow service role and users in the school
CREATE POLICY "Users can update students in their school" ON students
  FOR UPDATE
  USING (
    -- Allow service role (bypass RLS)
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.uid() = id AND email LIKE '%@%'
    )
    OR
    -- Allow authenticated users to update students in their school
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Allow service role (bypass RLS)
    EXISTS (
      SELECT 1 FROM auth.users WHERE auth.uid() = id AND email LIKE '%@%'
    )
    OR
    -- Allow authenticated users to update students in their school
    school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );
