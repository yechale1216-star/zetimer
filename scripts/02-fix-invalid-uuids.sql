-- Fix invalid school_id values that are not UUIDs
-- Generate a proper UUID for the test school
DO $$
DECLARE
  v_valid_uuid uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
  -- Update users with invalid school_id
  UPDATE users 
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Update students with invalid school_id  
  UPDATE students
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Update classes with invalid school_id
  UPDATE classes
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Update attendance with invalid school_id
  UPDATE attendance
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Update attendance_reports with invalid school_id
  UPDATE attendance_reports
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Update email_settings with invalid school_id
  UPDATE email_settings
  SET school_id = v_valid_uuid
  WHERE school_id IS NOT NULL AND school_id::text ~ '^\d+$';

  -- Ensure a school with this UUID exists
  INSERT INTO schools (id, name, code, email, phone, address, admin_id, created_at, updated_at)
  VALUES (
    v_valid_uuid,
    'Default Test School',
    'TEST001',
    'admin@testschool.com',
    '+1234567890',
    '123 School Street',
    v_valid_uuid,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
