-- CreateTable
CREATE TABLE "SlotLabel" (
    "trip" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotLabel_pkey" PRIMARY KEY ("trip","slotId")
);
