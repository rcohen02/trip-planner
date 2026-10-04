-- CreateTable
CREATE TABLE "ExtraSlot" (
    "id" TEXT NOT NULL,
    "trip" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtraSlot_trip_idx" ON "ExtraSlot"("trip");
