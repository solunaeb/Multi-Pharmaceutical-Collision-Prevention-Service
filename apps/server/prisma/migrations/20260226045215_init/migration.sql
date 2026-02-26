-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "birth_year" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ingredient" TEXT,
    "dose" TEXT,
    "days" INTEGER,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'active',
    "image_url" TEXT,
    "ocr_session_id" TEXT,
    "registered_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" DATETIME,
    CONSTRAINT "medications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "medications_ocr_session_id_fkey" FOREIGN KEY ("ocr_session_id") REFERENCES "ocr_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ocr_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "image_url" TEXT,
    "image_type" TEXT NOT NULL,
    "raw_ocr_result" TEXT,
    "parsed_meds_count" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ocr_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interaction_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profile_id" TEXT NOT NULL,
    "trigger_med_id" TEXT,
    "analyzed_med_ids" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "interactions" TEXT NOT NULL,
    "summary" TEXT,
    "action_guide" TEXT,
    "analyzed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interaction_logs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interaction_logs_trigger_med_id_fkey" FOREIGN KEY ("trigger_med_id") REFERENCES "medications" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "medications_profile_id_status_idx" ON "medications"("profile_id", "status");

-- CreateIndex
CREATE INDEX "medications_ingredient_idx" ON "medications"("ingredient");

-- CreateIndex
CREATE INDEX "interaction_logs_profile_id_analyzed_at_idx" ON "interaction_logs"("profile_id", "analyzed_at");

-- CreateIndex
CREATE INDEX "interaction_logs_risk_level_idx" ON "interaction_logs"("risk_level");
