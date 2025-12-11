# Clean Up Draft Assets Guide 🗑️

## Problem

You have many draft assets showing on your assets page. These are **orphaned assets** from before the race condition bug was fixed. They were created in the database but never properly registered on-chain, so they're stuck in DRAFT status forever.

---

## Solution: One-Click Cleanup

I've added a **"Clean Up Drafts"** button to your assets page that will delete all draft assets with one click!

### How to Use It

1. **Go to Assets Page**
   ```
   http://localhost:3000/dashboard/assets
   ```

2. **Look for the Red Button**
   - If you have draft assets, you'll see a red button next to "Upload Asset"
   - It will say **"Clean Up Drafts (X)"** where X is the number of drafts

3. **Click It**
   - Confirm the action
   - All draft assets will be deleted
   - Page automatically refreshes with clean list

---

## Manual Cleanup (Alternative)

If you prefer to use the API directly or via browser console:

### Browser Console Method

1. Open browser console (F12)
2. Paste this code (replace YOUR_WALLET_ADDRESS):

```javascript
fetch('/api/assets/cleanup-drafts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_WALLET_ADDRESS',
    confirm: 'DELETE_ALL_DRAFTS',
  }),
})
.then(r => r.json())
.then(console.log);
```

### cURL Method

```bash
curl -X POST http://localhost:3000/api/assets/cleanup-drafts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_WALLET_ADDRESS",
    "confirm": "DELETE_ALL_DRAFTS"
  }'
```

---

## What Gets Deleted

✅ **Only DRAFT assets are deleted**
❌ REGISTERED assets are NOT affected
❌ Assets with Token IDs are NOT affected
❌ Assets with Story Protocol IDs are NOT affected

The cleanup only targets assets that were never properly registered.

---

## Files Added

### 1. API Route: `src/pages/api/assets/cleanup-drafts.js`

**What it does:**
- Finds all DRAFT assets for a user
- Deletes them from the database
- Returns count of deleted assets

**Safety features:**
- Requires explicit confirmation (`confirm: 'DELETE_ALL_DRAFTS'`)
- Only deletes DRAFT status assets
- Returns list of deleted assets for logging

### 2. UI Button: `src/pages/dashboard/assets/index.js`

**What it adds:**
- Red "Clean Up Drafts" button
- Only shows if you have draft assets
- Shows count of drafts in parentheses
- Confirmation dialog before deletion
- Toast notifications for success/error
- Automatic refresh after cleanup

---

## Preventing Future Draft Assets

The race condition bug is now fixed! Future uploads will:

1. ✅ Create asset in database
2. ✅ Register on-chain → Get Token ID
3. ✅ **Wait for database to update** with Token ID
4. ✅ Register on Story Protocol
5. ✅ Update database with Story Protocol ID
6. ✅ Asset shows as REGISTERED with all IDs

No more orphaned drafts! 🎉

---

## Visual Guide

### Before Cleanup:
```
┌─────────────────────────────────────┐
│  My Assets                          │
│  ┌─────────┐  ┌───────────────┐   │
│  │ [DRAFT] │  │ Clean Up      │   │ ← Button appears
│  │ [DRAFT] │  │ Drafts (5)    │   │
│  │ [DRAFT] │  └───────────────┘   │
│  │ [DRAFT] │                       │
│  │ [DRAFT] │  ┌───────────────┐   │
│  └─────────┘  │ Upload Asset  │   │
│               └───────────────┘   │
└─────────────────────────────────────┘
```

### After Cleanup:
```
┌─────────────────────────────────────┐
│  My Assets                          │
│                                     │
│  ┌───────────────┐                 │
│  │ Upload Asset  │  ← Clean button gone
│  └───────────────┘                 │
│                                     │
│  (No draft assets)                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### Button Not Showing

**Possible reasons:**
1. No draft assets exist (check filter dropdown)
2. Page not refreshed after adding button
3. JavaScript error in console

**Solution:**
```bash
# Restart dev server
npm run dev

# Clear browser cache
# Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Cleanup Failed

**Check:**
1. Are you connected with your wallet?
2. Is the API route accessible?
3. Check browser console for errors

**Manual verification:**
```bash
# Check if API route exists
curl http://localhost:3000/api/assets/cleanup-drafts

# Should return: {"error":"Method not allowed"}
# (Because GET is not allowed, only POST)
```

### Want to Keep Some Drafts?

The cleanup deletes **ALL** drafts. If you want to keep some:

**Option 1: Export draft list first**
```javascript
// In browser console
fetch('/api/assets?userId=YOUR_WALLET_ADDRESS')
  .then(r => r.json())
  .then(data => {
    const drafts = data.assets.filter(a => a.status === 'DRAFT');
    console.table(drafts.map(a => ({
      id: a.id,
      title: a.title,
      created: a.createdAt,
    })));
  });
```

**Option 2: Delete individually**
- Click the "⋮" menu on each asset card
- Select "Delete"
- Confirms one at a time

---

## Summary

✅ **Added:** One-click "Clean Up Drafts" button
✅ **Safe:** Only deletes DRAFT assets
✅ **Fast:** Bulk deletion of all drafts
✅ **Automatic:** Page refreshes after cleanup
✅ **Prevented:** Future orphaned drafts (race condition fixed)

Your assets page will be clean in seconds! 🚀

