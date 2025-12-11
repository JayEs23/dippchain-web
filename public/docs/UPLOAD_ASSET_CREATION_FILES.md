# 📤 Upload & Asset Creation Files

Complete overview of frontend and backend files for asset upload and creation.

---

## 📋 Table of Contents

1. [Frontend Files](#frontend-files)
2. [Backend API Files](#backend-api-files)
3. [Upload Flow](#upload-flow)
4. [File Structure](#file-structure)

---

## 🎨 Frontend Files

### 1. Upload Page Component

**File:** `src/pages/dashboard/upload.js`

**Purpose:** Main upload page with multi-step process

**Key Features:**
- File selection with drag & drop
- Watermark generation and embedding
- IPFS upload via Pinata
- Thumbnail creation
- Metadata generation
- Database asset creation
- On-chain registration (DippChain Registry)
- Story Protocol registration

**Main Functions:**
- `processAndUpload()` - Main upload flow
- `registerOnStoryProtocol()` - Story Protocol registration
- `registerOnDippChain()` - DippChain Registry registration

**State Management:**
- File selection and validation
- Progress tracking for each step
- Form data (title, description, tags, visibility)
- Upload results and registration status

---

### 2. Enhanced Upload Flow Component

**File:** `src/components/upload/EnhancedUploadFlow.jsx`

**Purpose:** Reusable upload component with progress tracking

**Key Features:**
- Step-by-step progress indicator
- Error handling and recovery
- Automatic Story Protocol registration
- Success/error states

---

### 3. File Dropzone Component

**File:** `src/components/upload/FileDropzone.jsx`

**Purpose:** Drag & drop file upload interface

**Features:**
- Drag & drop support
- File type validation
- File size validation
- Preview for images
- Multiple file type support (IMAGE, VIDEO, AUDIO, TEXT, DOCUMENT)

---

## 🔧 Backend API Files

### 1. Asset Upload API

**File:** `src/pages/api/assets/upload.js`

**Endpoint:** `POST /api/assets/upload`

**Purpose:** Upload file to Pinata IPFS

**Request:**
- FormData with file
- Optional metadata

**Response:**
```json
{
  "success": true,
  "cid": "Qm...",
  "url": "https://gateway.pinata.cloud/ipfs/Qm...",
  "fileName": "example.jpg",
  "fileSize": 123456,
  "mimeType": "image/jpeg"
}
```

**Process:**
1. Parse multipart form data
2. Read file buffer
3. Create FormData for Pinata
4. Upload to Pinata IPFS
5. Return CID and gateway URL
6. Clean up temp file

**Error Handling:**
- File size validation (500MB max)
- Pinata authentication errors
- Network errors
- File type validation

---

### 2. Asset Create API

**File:** `src/pages/api/assets/create.js`

**Endpoint:** `POST /api/assets/create`

**Purpose:** Create asset record in database

**Request Body:**
```json
{
  "userId": "0x...",
  "title": "My Asset",
  "description": "Description",
  "assetType": "IMAGE",
  "originalFileName": "image.jpg",
  "fileSize": 123456,
  "mimeType": "image/jpeg",
  "pinataCid": "Qm...",
  "pinataUrl": "https://...",
  "thumbnailCid": "Qm...",
  "thumbnailUrl": "https://...",
  "watermarkId": "uuid",
  "metadataHash": "Qm...",
  "contentHash": "0x...",
  "visibility": "PRIVATE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "asset": {
      "id": "uuid",
      "title": "My Asset",
      "status": "DRAFT",
      ...
    }
  },
  "message": "Asset created successfully"
}
```

**Process:**
1. Validate required fields
2. Normalize wallet address
3. Find or create user
4. Check for duplicate content hash
5. Create asset record
6. Return created asset

**Error Handling:**
- Missing required fields
- User creation race conditions
- Duplicate content detection
- Database errors

---

### 3. Metadata Upload API

**File:** `src/pages/api/assets/metadata.js`

**Endpoint:** `POST /api/assets/metadata`

**Purpose:** Upload JSON metadata to Pinata

**Request Body:**
```json
{
  "metadata": {
    "name": "Asset Name",
    "description": "Description",
    "image": "https://...",
    "attributes": [...]
  },
  "name": "metadata.json"
}
```

**Response:**
```json
{
  "success": true,
  "cid": "Qm...",
  "url": "https://gateway.pinata.cloud/ipfs/Qm..."
}
```

**Process:**
1. Validate metadata object
2. Upload JSON to Pinata
3. Return CID and URL

---

## 🔄 Upload Flow

### Complete Flow Diagram

```
1. USER SELECTS FILE
   ↓
2. FRONTEND: Generate watermark ID & content hash
   ↓
3. FRONTEND: Apply watermark (if image)
   ↓
4. FRONTEND: Create thumbnail (if image)
   ↓
5. API: POST /api/assets/upload
   - Upload file to Pinata IPFS
   - Return CID and URL
   ↓
6. API: POST /api/assets/metadata
   - Upload metadata JSON to Pinata
   - Return metadata CID
   ↓
7. API: POST /api/assets/create
   - Create asset record in database
   - Auto-create user if needed
   - Return asset object
   ↓
8. FRONTEND: Register on DippChain Registry (optional)
   - Mint NFT on DippChainRegistry contract
   - Update asset with tokenId
   ↓
9. API: POST /api/assets/register-ip-modern
   - Register IP Asset on Story Protocol
   - Attach license terms
   - Create royalty vault
   - Update asset with storyProtocolId
   ↓
10. COMPLETE: Asset ready for fractionalization
```

---

## 📁 File Structure

```
src/
├── pages/
│   ├── dashboard/
│   │   └── upload.js                    # Main upload page
│   └── api/
│       └── assets/
│           ├── upload.js                # File upload to IPFS
│           ├── create.js                # Create asset in DB
│           ├── metadata.js               # Upload metadata JSON
│           └── register-ip-modern.js     # Story Protocol registration
│
├── components/
│   └── upload/
│       ├── EnhancedUploadFlow.jsx       # Reusable upload component
│       └── FileDropzone.jsx             # Drag & drop component
│
└── lib/
    ├── pinata.js                         # Pinata helper functions
    ├── watermark.js                      # Watermark & metadata generation
    └── utils.js                          # Utility functions (hash, etc.)
```

---

## 🔑 Key Functions

### Frontend (`upload.js`)

```javascript
// Main upload function
const processAndUpload = async () => {
  // 1. Generate watermark ID and content hash
  watermarkId = generateWatermarkId();
  contentHash = await generateContentHash(file);
  
  // 2. Apply watermark (if image)
  if (assetType === 'IMAGE') {
    processedFile = await embedImageWatermark(file, watermarkId);
  }
  
  // 3. Upload to IPFS
  const uploadResponse = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
  });
  
  // 4. Upload metadata
  const metadataResponse = await fetch('/api/assets/metadata', {...});
  
  // 5. Create asset in database
  const createResponse = await fetch('/api/assets/create', {
    method: 'POST',
    body: JSON.stringify({...}),
  });
  
  // 6. Register on Story Protocol (if enabled)
  if (formData.registerStoryProtocol) {
    await registerOnStoryProtocol(asset.id);
  }
};
```

### Backend (`create.js`)

```javascript
// Create asset endpoint
export default async function handler(req, res) {
  // 1. Validate required fields
  if (!userId || !title || !assetType || !pinataCid) {
    return sendValidationError(res, 'Missing required fields', [...]);
  }
  
  // 2. Find or create user
  let user = await prisma.user.findFirst({
    where: { walletAddress: normalizedAddress },
  });
  
  if (!user) {
    user = await prisma.user.create({...});
  }
  
  // 3. Check for duplicates
  if (contentHash) {
    const existing = await prisma.asset.findFirst({
      where: { contentHash, userId: user.id },
    });
    if (existing) {
      return sendConflict(res, 'You have already uploaded this content');
    }
  }
  
  // 4. Create asset
  const asset = await prisma.asset.create({
    data: {
      userId: user.id,
      title,
      description,
      assetType,
      pinataCid,
      pinataUrl,
      watermarkId,
      contentHash,
      status: 'DRAFT',
    },
  });
  
  return sendSuccess(res, { asset }, 'Asset created successfully', 201);
}
```

---

## 📝 Environment Variables Required

```bash
# Pinata IPFS
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=gateway.pinata.cloud

# Database
DATABASE_URL=postgresql://...

# Wallet (for on-chain registration)
WALLET_PRIVATE_KEY=0x...
```

---

## 🎯 Next Steps After Upload

1. **View Asset:** Navigate to `/dashboard/assets/[id]`
2. **Register on Story Protocol:** If not done during upload
3. **Create License:** Navigate to `/dashboard/licenses/create`
4. **Fractionalize:** Navigate to `/dashboard/fractions/create`
5. **List on Marketplace:** Navigate to `/dashboard/marketplace`

---

## 🔍 Error Handling

### Frontend Errors
- File size validation
- File type validation
- Network errors
- Wallet connection errors
- Progress step errors

### Backend Errors
- Missing required fields → 400 Validation Error
- Duplicate content → 409 Conflict
- Database errors → 500 with details
- Pinata errors → 500 with error message
- User creation race conditions → Handled gracefully

---

## 📊 Data Flow

```
File (Browser)
    ↓
Watermark Embedding (Frontend)
    ↓
IPFS Upload (Backend → Pinata)
    ↓
Metadata Upload (Backend → Pinata)
    ↓
Database Record (Backend → PostgreSQL)
    ↓
On-Chain Registration (Frontend → Smart Contract)
    ↓
Story Protocol Registration (Backend → Story SDK)
    ↓
Asset Ready ✅
```

---

This covers all upload and asset creation files in DippChain!

