ALTER TABLE "users"
    ADD COLUMN "email_verified_at" TIMESTAMP(3),
    ADD COLUMN "email_verification_token_hash" VARCHAR(128),
    ADD COLUMN "email_verification_token_expires_at" TIMESTAMP(3);

CREATE INDEX "users_email_verification_token_hash_idx"
    ON "users"("email_verification_token_hash");

-- Existing users are considered verified to preserve current access behavior.
UPDATE "users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at");
