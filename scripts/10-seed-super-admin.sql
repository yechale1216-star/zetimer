-- Seed super admin user with credentials: email = abinet24x@gmail.com, password = 123456
-- Password hash generated using bcryptjs with 10 rounds

-- First, check if the super admin user already exists
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id FROM users WHERE email = 'abinet24x@gmail.com' LIMIT 1;
  
  IF v_user_id IS NULL THEN
    -- Insert the super admin user
    -- Password: 123456
    -- Hash: $2b$10$.qDrgW90CwtmCKJkGrXsY.XUzvRQXHXInTkg8avDbW/mRafJ7shQS (generated with bcryptjs)
    INSERT INTO users (
      email, 
      password_hash, 
      full_name, 
      role, 
      is_active, 
      created_at, 
      updated_at
    ) VALUES (
      'abinet24x@gmail.com',
      '$2b$10$.qDrgW90CwtmCKJkGrXsY.XUzvRQXHXInTkg8avDbW/mRafJ7shQS',
      'Super Administrator',
      'super_admin',
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Super admin user created successfully: abinet24x@gmail.com';
  ELSE
    -- User already exists, update the password if needed
    UPDATE users 
    SET password_hash = '$2b$10$.qDrgW90CwtmCKJkGrXsY.XUzvRQXHXInTkg8avDbW/mRafJ7shQS',
        full_name = 'Super Administrator',
        role = 'super_admin',
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Super admin user updated: abinet24x@gmail.com';
  END IF;
END
$$;
