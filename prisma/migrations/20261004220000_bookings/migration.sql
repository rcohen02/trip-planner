-- CreateTable
CREATE TABLE "Booking" (
    "trip" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "confirmation" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("trip","placeId")
);
