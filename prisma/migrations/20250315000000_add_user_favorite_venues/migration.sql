-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteVenue" (
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteVenue_pkey" PRIMARY KEY ("userId","venueId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserFavoriteVenue_userId_idx" ON "UserFavoriteVenue"("userId");

-- CreateIndex
CREATE INDEX "UserFavoriteVenue_venueId_idx" ON "UserFavoriteVenue"("venueId");

-- AddForeignKey
ALTER TABLE "UserFavoriteVenue" ADD CONSTRAINT "UserFavoriteVenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteVenue" ADD CONSTRAINT "UserFavoriteVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default user for single-user profile (no auth yet)
INSERT INTO "User" ("id", "name", "email", "createdAt", "updatedAt") VALUES ('default-profile-user', 'Admin', 'admin@parkpilot.local', NOW(), NOW());
