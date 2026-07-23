ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Existing member accounts were provisioned with the temporary shared PIN.
UPDATE "User"
SET "mustChangePassword" = true
WHERE "role" = 'MEMBER';
