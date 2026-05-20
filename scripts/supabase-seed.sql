-- Minimal seed data for Supabase SQL Editor.
-- Admin login:
--   email: admin@example.com
--   password: admin1234

INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "createdAt", "updatedAt")
VALUES (
  'seed-admin-user',
  '관리자',
  'admin@example.com',
  '$2a$10$PbEsiT9ndAA/m69rgKctpu2QWPBqaIWPwcXGnmOQjRwe8ijmU5jRy',
  'ADMIN',
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "updatedAt" = NOW();

INSERT INTO "Client" ("id", "name", "slug", "logoUrl", "sharePasswordHash", "isPasswordProtected", "createdAt", "updatedAt")
VALUES
  ('seed-client-progressmedia', 'Progress Media', 'progressmedia', 'https://dummyimage.com/180x60/1d4ed8/ffffff&text=Progress', NULL, FALSE, NOW(), NOW()),
  ('seed-client-sample', 'Sample Client', 'sample-client', 'https://dummyimage.com/180x60/0f172a/ffffff&text=Sample', NULL, FALSE, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "logoUrl" = EXCLUDED."logoUrl",
  "isPasswordProtected" = EXCLUDED."isPasswordProtected",
  "updatedAt" = NOW();
