-- CreateTable
CREATE TABLE "TripDraft" (
    "email" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDraft_pkey" PRIMARY KEY ("email")
);
