-- Enums for membership role and lifecycle.
CREATE TYPE "OrganizationMemberRole" AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('active', 'invited', 'suspended');

-- Users become globally unique identities; organization_id remains as optional legacy link.
ALTER TABLE "users" ALTER COLUMN "organization_id" DROP NOT NULL;
DROP INDEX IF EXISTS "users_organization_id_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Membership join table (source of truth for org access).
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'member',
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key"
    ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_organization_id_idx"
    ON "organization_members"("organization_id");
CREATE INDEX "organization_members_user_id_idx"
    ON "organization_members"("user_id");

ALTER TABLE "organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-org users as active members.
INSERT INTO "organization_members" (
  "organization_id",
  "user_id",
  "role",
  "status",
  "updated_at"
)
SELECT
  u."organization_id",
  u."id",
  'owner'::"OrganizationMemberRole",
  'active'::"OrganizationMemberStatus",
  CURRENT_TIMESTAMP
FROM "users" u
WHERE u."organization_id" IS NOT NULL
ON CONFLICT ("organization_id", "user_id") DO NOTHING;
