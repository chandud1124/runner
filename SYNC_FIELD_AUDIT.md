# Sync Data Field Audit

## Frontend → Backend Data Flow

### 1. Frontend Sync Queue Data (`src/pages/ActiveRun.tsx` line 406)
```typescript
await db.syncQueue.add({
  type: 'run',
  data: { 
    runId,           // ✅ Local DB ID (not sent to server)
    points,          // ✅ Array of GPS points
    distanceKm,      // ✅ FIXED (was "distance")
    durationSec,     // ✅ Correct
    activityType,    // ✅ Correct
    updatedTiles     // ✅ Array of tile updates
  },
  timestamp: Date.now()
});
```

### 2. API Sync Function (`src/lib/api.ts` line 127)
```typescript
const runsData = pendingRuns.map(item => item.data);
await api.post('/runs/sync', { runs: runsData });
```

### 3. Backend Sync Endpoint (`backend/src/runRoutes.js` line 292)
```javascript
const { points, distanceKm, durationSec, activityType = 'run', updatedTiles = [] } = runData;
```

### 4. GPS Point Structure

**Frontend creates:**
```typescript
{
  lat: number,      // ✅ Correct
  lng: number,      // ✅ Correct  
  timestamp: number,// ✅ Correct
  accuracy?: number // ✅ Optional, correct
}
```

**Backend expects:**
- Same structure in antiCheat.js validation
- Uses `p.lat`, `p.lng`, `p.timestamp`

## ✅ All Fields Match Now!

### Fixed Issues:
1. ✅ `distance` → `distanceKm` (commit 3fe1915)
2. ✅ Backend logging enhanced (commit 33e3455)
3. ✅ Area calculation fixed (commit f496b6a)
4. ✅ Territory context fixed for non-PostGIS (commit 7ab2d0c)

### Remaining Issue:
❌ **Render deployment lag** - Latest code not deployed yet

## Test Status
- ✅ User creation works
- ❌ Run submission fails (old backend code on Render)
- ⏳ Waiting for Render to deploy commits 33e3455, 3fe1915, f496b6a

## Next Steps:
1. Trigger manual deploy on Render
2. Run `node backend/test-sync.js`
3. Should see all tests pass
