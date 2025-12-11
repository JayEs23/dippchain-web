
# Smart Asset Recovery System 🔧✅

## Overview

Instead of blindly retrying registration for draft assets, we now have a **diagnostic-driven recovery system** that:

1. **Analyzes** each asset to see exactly what failed
2. **Diagnoses** which step needs to be completed
3. **Provides** the appropriate recovery action
4. **Prevents** unnecessary work or wrong recovery paths

---

## How It Works

### Step 1: User Initiates Recovery

From the assets page, users can click **"Complete Registration"** on any draft asset (from the ⋮ menu).

### Step 2: Automatic Diagnosis

The system analyzes the asset record to determine:
- ✅ What steps were completed successfully
- ❌ Which step failed
- 📋 What recovery action is needed
- 🔧 Whether automatic recovery is possible

### Step 3: Show Recovery Plan

A modal displays:
- **Completed Steps** - What's already done (with data)
- **Failed Step** - What went wrong
- **Recovery Plan** - What needs to happen next
- **Action Button** - How to fix it

### Step 4: Execute Recovery

Based on the diagnosis, the system:
- Completes missing steps automatically (where possible)
- Guides user through manual steps (when blockchain interaction needed)
- Updates the asset status when complete

---

## Diagnostic Logic

### Inspection Order

The system checks in this order:

#### 1. IPFS Upload (Step 1)
**Checks:**
- `pinataCid` exists?
- `pinataUrl` exists?

**If Missing:**
- ❌ **Cannot Recover**: File never uploaded
- 🔄 **Action**: RE_UPLOAD - User must upload asset again

---

#### 2. Watermark & Hash (Step 2)
**Checks:**
- `watermarkId` exists?
- `contentHash` exists?

**If Missing:**
- ❌ **Cannot Recover**: Watermark/hash not generated
- 🔄 **Action**: RE_UPLOAD - User must upload asset again

---

#### 3. DippChain Registration (Step 3)
**Checks:**
- `dippchainTokenId` exists?
- `dippchainTxHash` exists?
- `registeredOnChain` = true?

**If Missing:**
- ✅ **Can Recover**: Asset has IPFS data and watermark
- 🔄 **Action**: REGISTER_ONCHAIN - Complete on-chain registration
- 📦 **Data Needed**: `contentHash`, `metadataUri`, `watermarkId`

---

#### 4. Story Protocol (Step 4)
**Checks:**
- `storyProtocolId` exists?
- `storyProtocolTxHash` exists?

**If Missing:**
- ✅ **Can Recover**: Asset is registered on-chain
- 🔄 **Action**: REGISTER_STORY_PROTOCOL - Register on Story Protocol
- 📦 **Data Needed**: `tokenId`, `ipMetadataURI`, `ipMetadataHash`

---

#### 5. Status Update (Step 5)
**Checks:**
- All registration data exists but `status` is still DRAFT?

**If True:**
- ✅ **Can Recover**: Just update status
- 🔄 **Action**: UPDATE_STATUS - Change status to REGISTERED

---

## Recovery Actions

### 1. RE_UPLOAD
**When:** File never uploaded or critical data missing  
**User Action:** Must re-upload the asset completely  
**Automatic:** No  
**Modal Shows:** "You need to upload the asset again"

### 2. REGISTER_ONCHAIN
**When:** IPFS data exists but not registered on-chain  
**User Action:** Must sign blockchain transaction  
**Automatic:** Partially (guides user through process)  
**Modal Shows:** "Complete on-chain registration manually"

### 3. REGISTER_STORY_PROTOCOL
**When:** On-chain registered but not on Story Protocol  
**User Action:** System handles it (may need wallet signature)  
**Automatic:** Yes  
**Modal Shows:** "Complete Story Protocol registration" → Executes automatically

### 4. UPDATE_STATUS
**When:** Everything complete but status stuck as DRAFT  
**User Action:** None  
**Automatic:** Yes  
**Modal Shows:** "Fix status automatically" → Executes immediately

---

## User Interface

### Recovery Modal Components

#### Header
```
📋 Asset Recovery Diagnostic
[Asset Title]
Status: DRAFT
```

#### Completed Steps Section
```
✅ Completed Steps

✅ Step 1: IPFS Upload
   cid: QmXyZ...
   url: https://...

✅ Step 2: Watermark & Hash
   watermarkId: DIPPC-...
   contentHash: abc123...
```

#### Failed Step Section
```
⚠️ Failed Step

⚠️ Step 3: DippChain On-Chain Registration
   Asset not registered on DippChain Registry
```

#### Recovery Plan Section
```
📋 Recovery Plan

The asset has IPFS data and watermark, but was never 
registered on-chain. You can complete the on-chain registration.

[Cancel]  [Recover Asset]
```

---

## Files Created

### 1. API Route: `/api/assets/diagnose.js`

**Purpose:** Analyze draft asset and return diagnosis

**Request:**
```javascript
POST /api/assets/diagnose
{
  "assetId": "uuid"
}
```

**Response:**
```javascript
{
  "success": true,
  "diagnosis": {
    "assetId": "uuid",
    "status": "DRAFT",
    "completedSteps": [
      {
        "step": 1,
        "name": "IPFS Upload",
        "data": { "cid": "...", "url": "..." }
      }
    ],
    "failedStep": {
      "step": 3,
      "name": "DippChain Registration",
      "reason": "Asset not registered on-chain"
    },
    "canRecover": true,
    "recoveryAction": "REGISTER_ONCHAIN",
    "reason": "Explanation for user",
    "recoveryData": { /* Data needed for recovery */ }
  }
}
```

---

### 2. Component: `/components/recovery/AssetRecoveryModal.jsx`

**Purpose:** UI for showing diagnosis and executing recovery

**Features:**
- Automatic diagnosis on open
- Visual display of completed/failed steps
- Clear recovery instructions
- One-click recovery (when possible)
- Loading states during recovery
- Toast notifications for success/failure

**Usage:**
```jsx
<AssetRecoveryModal
  asset={draftAsset}
  onClose={() => setRecoveryAsset(null)}
  onRecoveryComplete={() => {
    // Refresh assets list
    fetchAssets();
  }}
/>
```

---

### 3. Updated: `/pages/dashboard/assets/index.js`

**Changes:**
- Added "Complete Registration" option for DRAFT assets
- Opens recovery modal instead of blind retry
- Integrated with existing menu system
- Refreshes list after successful recovery

---

## Example Scenarios

### Scenario 1: Partial IPFS Upload
**Asset State:**
```
pinataCid: null
pinataUrl: null
watermarkId: "DIPPC-123"
```

**Diagnosis:**
- Step 1 Failed: IPFS Upload
- Cannot Recover
- Action: RE_UPLOAD

**User Sees:**
> "The file was never uploaded to IPFS. You need to upload the asset again."

---

### Scenario 2: On-Chain Registration Failed
**Asset State:**
```
pinataCid: "QmXyZ..."
pinataUrl: "https://..."
watermarkId: "DIPPC-123"
contentHash: "abc123"
dippchainTokenId: null
```

**Diagnosis:**
- Steps 1-2 Complete
- Step 3 Failed: DippChain Registration
- Can Recover
- Action: REGISTER_ONCHAIN

**User Sees:**
> "The asset has IPFS data and watermark, but was never registered on-chain. You can complete the on-chain registration."

[Recover Asset] button available

---

### Scenario 3: Story Protocol Missing
**Asset State:**
```
pinataCid: "QmXyZ..."
watermarkId: "DIPPC-123"
dippchainTokenId: "2"
dippchainTxHash: "0x..."
storyProtocolId: null
```

**Diagnosis:**
- Steps 1-3 Complete
- Step 4 Failed: Story Protocol
- Can Recover
- Action: REGISTER_STORY_PROTOCOL

**User Sees:**
> "The asset is registered on-chain but not on Story Protocol. You can complete the Story Protocol registration."

[Recover Asset] → Executes automatically

---

### Scenario 4: Status Stuck
**Asset State:**
```
pinataCid: "QmXyZ..."
dippchainTokenId: "2"
storyProtocolId: "0xe343..."
status: "DRAFT"  ← Should be REGISTERED
```

**Diagnosis:**
- Steps 1-4 Complete
- Step 5 Issue: Status not updated
- Can Recover
- Action: UPDATE_STATUS

**User Sees:**
> "All registrations are complete but the status is stuck as DRAFT. This can be fixed automatically."

[Recover Asset] → Fixes instantly

---

## Benefits

### 1. Intelligent Recovery
- ✅ No wasted effort on wrong recovery paths
- ✅ Clear understanding of what went wrong
- ✅ Appropriate action for each failure type

### 2. User Experience
- ✅ Transparent diagnosis process
- ✅ Clear visual feedback
- ✅ Automatic recovery where possible
- ✅ Guided manual recovery where needed

### 3. Data Integrity
- ✅ Prevents duplicate registrations
- ✅ Preserves existing data
- ✅ Only fixes what's broken

### 4. Developer Experience
- ✅ Easy to debug failed assets
- ✅ Clear logs of what failed
- ✅ Extensible for new recovery types

---

## Testing

### Test Each Recovery Path

#### Test 1: RE_UPLOAD Scenario
```sql
-- Create incomplete asset in database
INSERT INTO assets (
  id, userId, title, status,
  pinataCid  -- Leave NULL
) VALUES (...);

-- Try recovery → Should show "RE_UPLOAD" action
```

#### Test 2: REGISTER_ONCHAIN Scenario
```sql
-- Create asset with IPFS but no blockchain data
INSERT INTO assets (
  id, userId, title, status,
  pinataCid, pinataUrl, watermarkId, contentHash,
  dippchainTokenId  -- Leave NULL
) VALUES (...);

-- Try recovery → Should show "REGISTER_ONCHAIN" action
```

#### Test 3: REGISTER_STORY_PROTOCOL Scenario
```sql
-- Create asset with blockchain but no Story Protocol
INSERT INTO assets (
  id, userId, title, status,
  pinataCid, dippchainTokenId,
  storyProtocolId  -- Leave NULL
) VALUES (...);

-- Try recovery → Should auto-register on Story Protocol
```

#### Test 4: UPDATE_STATUS Scenario
```sql
-- Create fully registered asset with wrong status
INSERT INTO assets (
  id, userId, title,
  status,  -- Set to 'DRAFT'
  pinataCid, dippchainTokenId, storyProtocolId
) VALUES (...);

-- Try recovery → Should update status to 'REGISTERED'
```

---

## Future Enhancements

### Potential Additions

1. **Batch Recovery**
   - Diagnose multiple drafts at once
   - Show summary of recovery needs
   - Bulk recovery for similar failures

2. **Recovery History**
   - Log recovery attempts
   - Track success/failure rates
   - Analytics on common failure points

3. **Preventive Diagnostics**
   - Check assets periodically
   - Alert on stuck registrations
   - Auto-recover simple issues

4. **Advanced Recovery**
   - Retry with different parameters
   - Fallback strategies
   - Manual data entry for edge cases

---

## Summary

The Smart Recovery System provides:

✅ **Intelligent diagnosis** of draft assets  
✅ **Appropriate recovery actions** for each failure type  
✅ **Clear user guidance** through recovery process  
✅ **Automatic recovery** where possible  
✅ **Data preservation** and integrity  
✅ **Better UX** than blind retry attempts  

No more guessing what went wrong - the system tells you exactly what failed and how to fix it! 🎉

