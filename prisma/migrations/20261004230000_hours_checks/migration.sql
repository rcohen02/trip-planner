-- CreateTable
CREATE TABLE "HoursCheck" (
    "trip" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoursCheck_pkey" PRIMARY KEY ("trip","placeId")
);
