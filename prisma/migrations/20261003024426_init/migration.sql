-- CreateTable
CREATE TABLE "SlotAssignment" (
    "trip" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotAssignment_pkey" PRIMARY KEY ("trip","slotId")
);

-- CreateTable
CREATE TABLE "TodoState" (
    "trip" TEXT NOT NULL,
    "todoId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoState_pkey" PRIMARY KEY ("trip","todoId")
);

-- CreateTable
CREATE TABLE "TripShare" (
    "token" TEXT NOT NULL,
    "trip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TripShare_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotAssignment_trip_placeId_key" ON "SlotAssignment"("trip", "placeId");

-- CreateIndex
CREATE INDEX "TripShare_trip_idx" ON "TripShare"("trip");
