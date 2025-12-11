-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'PROCESSING', 'REGISTERED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC', 'LICENSED');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('PERSONAL', 'COMMERCIAL', 'EXCLUSIVE', 'NON_EXCLUSIVE', 'ROYALTY_FREE', 'RIGHTS_MANAGED');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FractionStatus" AS ENUM ('PENDING', 'DEPLOYED', 'TRADING', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PENDING_TRANSFER', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('FOR', 'AGAINST', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'REVIEWING', 'CONFIRMED', 'FALSE_POSITIVE', 'TAKEDOWN_SENT', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RevenueSource" AS ENUM ('LICENSE_SALE', 'FRACTION_SALE', 'ROYALTY', 'SECONDARY_SALE');

-- CreateEnum
CREATE TYPE "RevenueStatus" AS ENUM ('PENDING', 'CLAIMABLE', 'CLAIMED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('ASSET_REGISTRATION', 'LICENSE_PURCHASE', 'FRACTION_PURCHASE', 'FRACTION_SALE', 'ROYALTY_CLAIM', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletAddress" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetType" "AssetType" NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "pinataCid" TEXT,
    "pinataUrl" TEXT,
    "thumbnailCid" TEXT,
    "thumbnailUrl" TEXT,
    "watermarkId" TEXT,
    "metadataHash" TEXT,
    "contentHash" TEXT,
    "storyProtocolId" TEXT,
    "storyProtocolTxHash" TEXT,
    "storyNftTokenId" TEXT,
    "storyNftContract" TEXT,
    "dippchainTokenId" TEXT,
    "dippchainTxHash" TEXT,
    "registeredOnChain" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "licenseeId" TEXT,
    "licenseType" "LicenseType" NOT NULL,
    "templateId" TEXT,
    "terms" JSONB,
    "price" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'IP',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "onChainLicenseId" TEXT,
    "txHash" TEXT,
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "terms" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fractionalizations" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "totalSupply" DECIMAL(65,30) NOT NULL,
    "availableSupply" DECIMAL(65,30) NOT NULL,
    "pricePerToken" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETH',
    "tokenAddress" TEXT,
    "deployTxHash" TEXT,
    "royaltyPercentage" DECIMAL(65,30) NOT NULL DEFAULT 10.00,
    "status" "FractionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fractionalizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraction_holders" (
    "id" TEXT NOT NULL,
    "fractionalizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "percentageOwned" DECIMAL(65,30) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraction_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "fractionalizationId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingType" "ListingType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "pricePerToken" DECIMAL(65,30) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETH',
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "fractionalizationId" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "totalPaid" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IP',
    "txHash" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentCid" TEXT,
    "documentUrl" TEXT,
    "votingStart" TIMESTAMP(3) NOT NULL,
    "votingEnd" TIMESTAMP(3) NOT NULL,
    "quorumRequired" DECIMAL(65,30) NOT NULL,
    "votesFor" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "votesAgainst" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "votesAbstain" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "onChainProposalId" TEXT,
    "executionTxHash" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_scans" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "searchQuery" TEXT,
    "matchesFound" INTEGER NOT NULL DEFAULT 0,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sentinel_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_alerts" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scanId" TEXT,
    "platform" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "screenshotCid" TEXT,
    "screenshotUrl" TEXT,
    "similarityScore" DECIMAL(65,30) NOT NULL,
    "watermarkFound" BOOLEAN NOT NULL DEFAULT false,
    "metadataMatch" BOOLEAN NOT NULL DEFAULT false,
    "evidenceCid" TEXT,
    "evidenceUrl" TEXT,
    "evidenceData" JSONB,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "actionTaken" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "sentinel_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenues" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "fractionalizationId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETH',
    "source" "RevenueSource" NOT NULL,
    "sourceId" TEXT,
    "status" "RevenueStatus" NOT NULL DEFAULT 'PENDING',
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "claimTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETH',
    "txHash" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "assets_watermarkId_key" ON "assets"("watermarkId");

-- CreateIndex
CREATE INDEX "assets_userId_idx" ON "assets"("userId");

-- CreateIndex
CREATE INDEX "assets_watermarkId_idx" ON "assets"("watermarkId");

-- CreateIndex
CREATE INDEX "assets_storyProtocolId_idx" ON "assets"("storyProtocolId");

-- CreateIndex
CREATE INDEX "licenses_assetId_idx" ON "licenses"("assetId");

-- CreateIndex
CREATE INDEX "licenses_creatorId_idx" ON "licenses"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "fractionalizations_assetId_key" ON "fractionalizations"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "fraction_holders_fractionalizationId_userId_key" ON "fraction_holders"("fractionalizationId", "userId");

-- CreateIndex
CREATE INDEX "marketplace_listings_fractionalizationId_idx" ON "marketplace_listings"("fractionalizationId");

-- CreateIndex
CREATE INDEX "marketplace_listings_sellerId_idx" ON "marketplace_listings"("sellerId");

-- CreateIndex
CREATE INDEX "orders_listingId_idx" ON "orders"("listingId");

-- CreateIndex
CREATE INDEX "orders_fractionalizationId_idx" ON "orders"("fractionalizationId");

-- CreateIndex
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX "proposals_creatorId_idx" ON "proposals"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_proposalId_voterId_key" ON "votes"("proposalId", "voterId");

-- CreateIndex
CREATE INDEX "sentinel_scans_assetId_idx" ON "sentinel_scans"("assetId");

-- CreateIndex
CREATE INDEX "sentinel_alerts_assetId_idx" ON "sentinel_alerts"("assetId");

-- CreateIndex
CREATE INDEX "sentinel_alerts_userId_idx" ON "sentinel_alerts"("userId");

-- CreateIndex
CREATE INDEX "revenues_userId_idx" ON "revenues"("userId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "license_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fractionalizations" ADD CONSTRAINT "fractionalizations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraction_holders" ADD CONSTRAINT "fraction_holders_fractionalizationId_fkey" FOREIGN KEY ("fractionalizationId") REFERENCES "fractionalizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraction_holders" ADD CONSTRAINT "fraction_holders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_fractionalizationId_fkey" FOREIGN KEY ("fractionalizationId") REFERENCES "fractionalizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_fractionalizationId_fkey" FOREIGN KEY ("fractionalizationId") REFERENCES "fractionalizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_scans" ADD CONSTRAINT "sentinel_scans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_alerts" ADD CONSTRAINT "sentinel_alerts_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_alerts" ADD CONSTRAINT "sentinel_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_alerts" ADD CONSTRAINT "sentinel_alerts_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "sentinel_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenues" ADD CONSTRAINT "revenues_fractionalizationId_fkey" FOREIGN KEY ("fractionalizationId") REFERENCES "fractionalizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
