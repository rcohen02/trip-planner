-- CreateTable
CREATE TABLE "Profile" (
    "email" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "ProfileChange" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undone" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProfileChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileChange_email_createdAt_idx" ON "ProfileChange"("email", "createdAt");
