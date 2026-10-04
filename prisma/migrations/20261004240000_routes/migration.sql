-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "trip" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "line" JSONB NOT NULL,
    "startLabel" TEXT,
    "endLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Route_trip_idx" ON "Route"("trip");
