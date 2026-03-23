-- Add source language support to applications.
CREATE TYPE "ApplicationLanguage" AS ENUM ('JS', 'PHP', 'GO', 'PYTHON', 'OTHER');

ALTER TABLE "applications"
ADD COLUMN "language" "ApplicationLanguage" NOT NULL DEFAULT 'OTHER';
