# Sentinel Detection System - Prototype

## Overview

Sentinel is DippChain's AI-powered content protection system that continuously scans the internet for unauthorized use of creator content. This prototype implements the core detection, evidence generation, and alert management functionality.

## Components

### 1. Detection Engine (`src/lib/sentinel/detection.js`)
- **Image Similarity Detection**: Calculates similarity scores between original and detected content
- **Watermark Extraction**: Extracts embedded watermarks from detected content
- **Metadata Verification**: Verifies if detected content matches asset metadata
- **Severity Determination**: Automatically determines alert severity based on detection results

### 2. Evidence Package Generator (`src/lib/sentinel/evidence.js`)
- **Complete Evidence Packages**: Creates comprehensive evidence packages including:
  - Asset information
  - Detection details (platform, URL, timestamps)
  - Similarity scores
  - Watermark verification
  - Metadata matches
  - Screenshots (when available)
- **IPFS Storage**: Uploads evidence packages to Pinata/IPFS for permanent storage

### 3. Scanner (`src/lib/sentinel/scanner.js`)
- **Platform Scanning**: Simulates scanning across multiple platforms
  - Social media (Twitter, Instagram, Facebook, TikTok, YouTube, Pinterest, Reddit)
  - E-commerce (Amazon, Etsy, eBay)
- **Screenshot Capture**: Captures screenshots of detected content (prototype placeholder)
- **Search Query Generation**: Generates search queries based on asset metadata

### 4. API Routes

#### `/api/sentinel/scan` (POST)
Initiates a scan for an asset across specified platforms.

**Request:**
```json
{
  "assetId": "uuid",
  "platforms": ["twitter", "instagram"], // Optional, defaults to top 3
  "searchQuery": "optional search query"
}
```

**Response:**
```json
{
  "success": true,
  "scan": {
    "id": "scan-uuid",
    "status": "RUNNING",
    "startedAt": "2025-12-11T..."
  },
  "message": "Scan initiated. Results will be available shortly."
}
```

#### `/api/sentinel/alerts` (GET)
Retrieves alerts for a user.

**Query Parameters:**
- `userId` - User ID (optional if walletAddress/email provided)
- `walletAddress` - Wallet address (optional)
- `email` - Email address (optional)
- `assetId` - Filter by asset (optional)
- `status` - Filter by status (optional)
- `severity` - Filter by severity (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

#### `/api/sentinel/alerts` (POST)
Creates a new alert (used internally by scan process).

#### `/api/sentinel/alerts/[id]/actions` (PATCH)
Updates alert status/action.

**Request:**
```json
{
  "action": "CONFIRMED" | "FALSE_POSITIVE" | "TAKEDOWN_SENT" | "RESOLVED" | "REVIEWING",
  "notes": "Optional notes"
}
```

#### `/api/sentinel/scheduled-scan` (POST)
Cron job endpoint for automatic scheduled scans.

**Authentication:** Requires `Authorization: Bearer ${CRON_SECRET}` header

**Functionality:**
- Scans all registered assets that haven't been scanned in the last 24 hours
- Limits to 10 assets per run to avoid timeout
- Scans 2 platforms per asset

## Frontend UI

### `/dashboard/sentinel`
Sentinel Alerts Dashboard with:
- **Stats Cards**: Total alerts, new alerts, high priority, critical
- **Filters**: Filter by status and severity
- **Alert List**: Displays all alerts with:
  - Severity and status badges
  - Platform information
  - Source URL
  - Screenshot (if available)
  - Similarity score
  - Watermark verification status
  - Detection timestamp
- **Alert Actions**: 
  - Confirm Infringement
  - Mark False Positive
  - Send Takedown

## Database Schema

### SentinelScan
- Tracks scan operations
- Links to asset
- Records platform, search query, matches found, status

### SentinelAlert
- Individual detection alerts
- Contains detection details (platform, URL, similarity, watermark, metadata)
- Evidence package (CID, URL, JSON data)
- Status and severity tracking
- Action history

## Prototype Limitations

1. **Mock Scanning**: Platform scanning returns mock results (no actual API integration)
2. **Simplified Similarity**: Uses basic hash comparison (not perceptual hashing)
3. **Watermark Extraction**: Placeholder (not fully implemented)
4. **Screenshot Capture**: Placeholder (not implemented)
5. **Limited Platforms**: Only simulates scanning, doesn't actually scan real platforms

## Production Enhancements Needed

1. **Real Platform APIs**: Integrate with actual platform APIs or web scraping services
2. **Perceptual Hashing**: Use proper image similarity algorithms (pHash, dHash, etc.)
3. **Watermark Extraction**: Implement full LSB steganography extraction
4. **Screenshot Service**: Use headless browser (Puppeteer) or screenshot API
5. **AI Detection**: Integrate with image recognition APIs for better detection
6. **Rate Limiting**: Implement proper rate limiting for platform APIs
7. **Cron Job Setup**: Configure actual cron job (Vercel Cron, etc.)

## Usage

### Manual Scan
```javascript
POST /api/sentinel/scan
{
  "assetId": "asset-uuid",
  "platforms": ["twitter", "instagram"]
}
```

### View Alerts
```javascript
GET /api/sentinel/alerts?walletAddress=0x...&status=NEW
```

### Update Alert
```javascript
PATCH /api/sentinel/alerts/[id]/actions
{
  "action": "CONFIRMED"
}
```

### Scheduled Scans
Set up a cron job to call `/api/sentinel/scheduled-scan` periodically (e.g., daily).

## Environment Variables

- `CRON_SECRET`: Secret for authenticating scheduled scan requests
- `PINATA_JWT`: Pinata JWT token for IPFS uploads
- `NEXT_PUBLIC_APP_URL`: Base URL for internal API calls (for scheduled scans)

## Next Steps

1. ✅ Core detection engine
2. ✅ Evidence package generation
3. ✅ Alert management API
4. ✅ Frontend UI
5. ⚠️ Real platform integration
6. ⚠️ Advanced similarity detection
7. ⚠️ Watermark extraction
8. ⚠️ Screenshot capture
9. ⚠️ Cron job configuration

