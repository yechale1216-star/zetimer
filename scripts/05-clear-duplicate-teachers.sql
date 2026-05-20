-- Clear duplicate teachers with the same email (keep the most recent one)
-- This allows testing teacher registration with the same email address
DELETE FROM teachers 
WHERE id IN (
  SELECT t.id 
  FROM teachers t
  JOIN users u ON t.user_id = u.id
  WHERE u.email = 'yechaleabinet@gmail.com'
  AND t.created_at NOT IN (
    SELECT MAX(created_at) 
    FROM teachers t2
    JOIN users u2 ON t2.user_id = u2.id
    WHERE u2.email = 'yechaleabinet@gmail.com'
  )
);

-- Also delete orphaned user records if needed
DELETE FROM users 
WHERE email = 'yechaleabinet@gmail.com' 
AND id NOT IN (SELECT user_id FROM teachers WHERE user_id IS NOT NULL);
