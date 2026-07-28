-- CreateTable: system_roles
-- Stores system-default and school-isolated custom role definitions
CREATE TABLE "system_roles" (
    "id"          TEXT NOT NULL,
    "schoolId"    TEXT,
    "key"         TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "color"       TEXT NOT NULL DEFAULT '#6366f1',
    "isSystem"    BOOLEAN NOT NULL DEFAULT true,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "system_roles_schoolId_idx" ON "system_roles"("schoolId");
CREATE INDEX "system_roles_key_idx" ON "system_roles"("key");

-- AddForeignKey
ALTER TABLE "system_roles" ADD CONSTRAINT "system_roles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the 3 global system default roles (schoolId = null)
INSERT INTO "system_roles" ("id", "schoolId", "key", "name", "description", "color", "isSystem", "isActive", "permissions", "sortOrder", "createdAt", "updatedAt")
VALUES
(
    gen_random_uuid()::text,
    NULL,
    'registrar',
    'Student Registration Officer (Registrar)',
    'Responsible for student intake, enrollment processing, and maintaining official student records.',
    '#6366f1',
    true,
    true,
    '{
      "students":   {"view":true,"create":true,"edit":true,"delete":false},
      "teachers":   {"view":true,"create":false,"edit":false,"delete":false},
      "assignments":{"view":true,"assign":false,"remove":false},
      "promotion":  {"view":true,"promote":false,"reverse":false},
      "attendance": {"view":true,"mark":false,"export":false},
      "discipline": {"view":false,"create":false,"resolve":false},
      "calls":      {"view":false,"make":false},
      "communication":{"view":true,"send":false},
      "reports":    {"view":true,"export":true},
      "announcements":{"view":true,"create":false},
      "settings":   {"view":false,"edit":false},
      "users":      {"view":false,"create_user":false,"edit_user":false,"delete_user":false,"manage_roles":false}
    }'::jsonb,
    1,
    NOW(),
    NOW()
),
(
    gen_random_uuid()::text,
    NULL,
    'discipline_officer',
    'Student Discipline & Conduct Officer',
    'Manages student behavioral incidents, discipline cases, follow-ups, and conduct records.',
    '#f59e0b',
    true,
    true,
    '{
      "students":   {"view":true,"create":false,"edit":false,"delete":false},
      "teachers":   {"view":true,"create":false,"edit":false,"delete":false},
      "assignments":{"view":false,"assign":false,"remove":false},
      "promotion":  {"view":false,"promote":false,"reverse":false},
      "attendance": {"view":true,"mark":false,"export":false},
      "discipline": {"view":true,"create":true,"resolve":true},
      "calls":      {"view":false,"make":false},
      "communication":{"view":true,"send":true},
      "reports":    {"view":true,"export":true},
      "announcements":{"view":true,"create":false},
      "settings":   {"view":false,"edit":false},
      "users":      {"view":false,"create_user":false,"edit_user":false,"delete_user":false,"manage_roles":false}
    }'::jsonb,
    2,
    NOW(),
    NOW()
),
(
    gen_random_uuid()::text,
    NULL,
    'call_center',
    'School Call Center Officer',
    'Handles parent communications via calls, manages call queues, and logs call outcomes.',
    '#14b8a6',
    true,
    true,
    '{
      "students":   {"view":true,"create":false,"edit":false,"delete":false},
      "teachers":   {"view":false,"create":false,"edit":false,"delete":false},
      "assignments":{"view":false,"assign":false,"remove":false},
      "promotion":  {"view":false,"promote":false,"reverse":false},
      "attendance": {"view":true,"mark":false,"export":false},
      "discipline": {"view":false,"create":false,"resolve":false},
      "calls":      {"view":true,"make":true},
      "communication":{"view":true,"send":true},
      "reports":    {"view":true,"export":false},
      "announcements":{"view":true,"create":false},
      "settings":   {"view":false,"edit":false},
      "users":      {"view":false,"create_user":false,"edit_user":false,"delete_user":false,"manage_roles":false}
    }'::jsonb,
    3,
    NOW(),
    NOW()
);
