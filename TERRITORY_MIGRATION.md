# Territory System Migration: Grid Tiles → Path-Based

## Summary
TerritoryRunner has been migrated from a **fixed-grid tile system** to an **organic path-based territory system**. Instead of capturing multiple small square grid tiles when a user runs, each run now creates ONE unique territory polygon that exactly matches the buffered running path.

## What Changed

### Database Level
✅ **territories table schema updated:**
- **Removed**: `tile_id` (TEXT UNIQUE), `strength` (INTEGER), `last_claimed` (TIMESTAMPTZ)
- **Added**: `run_id` (INTEGER UNIQUE REFERENCES runs(id)) - territories are now 1:1 with runs
- **Kept**: `id`, `owner_id`, `geojson`, `created_at`, `activity_type`, `distance_km`

### Backend API Changes

#### POST `/api/runs` (Single Run Submit)
**Old**: Returned `{ runId, updatedTiles: [{tileId, ownerId, strength, flipped}, ...] }`
**New**: Returns `{ runId, territoryCreated: true }`
- One API call = one run = one territory (no tile discovery)
- Simpler response, no tile tracking needed

#### POST `/api/runs/sync` (Batch Sync)
**Old**: Complex tile-by-tile conquest logic with conflict resolution
**New**: Simple loop - create run, create territory, update stats
- Each run in batch creates exactly one territory
- No client-side tile calculations

#### GET `/api/territories` 
**Changes**:
- Returns territories with `run_id`, `owner_name`, `distance_km`, `created_at`
- No more `tile_id`, `strength`, or `last_claimed`
- Proper JOINs with `users` and `runs` tables

#### GET `/api/territories/mine-history`
**Changes**:
- Filters by `owner_id` and `created_at` (not tile-based)
- Pagination uses `created_at` instead of `last_claimed`
- Activity type filtering still works (run/cycle)

#### GET `/api/territories/:runId/info` 
**Old endpoint**: `/territories/:tileId/info`
**New endpoint**: `/territories/:runId/info`
- Returns single territory for a specific run
- Includes run metadata: distance, duration, activity type

### Frontend Changes

#### Component Types
**RealTerritoryMap.tsx**:
```typescript
// Old
type Territory = {
  tile_id: string;
  owner_id: number;
  strength: number;
  geojson: { geometry: { coordinates: number[][][] } };
};

// New
type Territory = {
  id: number;
  run_id: number;
  owner_id: number;
  distance_km: number;
  activity_type?: 'run' | 'cycle';
  created_at?: string;
  geojson: { geometry: { coordinates: number[][][] | number[][] } };
};
```

#### Territory Rendering
- Changed Polygon key from `territory.tile_id` to `territory.run_id`
- Click handler now calls `/territories/:runId/info` instead of `:tileId/info`
- All territory display logic unchanged (still renders GeoJSON polygons)

#### TerritoryInfoPanel.tsx
- Removed: "Strength" badge, "Tile ID" display
- Added: "Distance Run", "Activity Type" badge, "Created Date"
- Updated copy: "This territory was created from your run!" instead of strength-based messaging

### What You Get Now

| Feature | Before | After |
|---------|--------|-------|
| Territory Count | Many small tiles per run | One territory per run |
| Territory Shape | Square grid | Curved organic shape (follows running path) |
| Territory Size | Fixed ~0.02 km² | Variable (based on run distance) |
| Ownership | Strength-based (can be lost) | Permanent per run |
| Uniqueness | Same grid tile = same territory | Different paths = different territories |
| Simplicity | Complex tile tracking | Simple 1:1 run:territory mapping |

## File-by-File Changes

### Backend
1. **backend/src/db.js**
   - Simplified territories table schema (removed tile_id, strength, last_claimed)

2. **backend/src/runRoutes.js**
   - Removed: `import { tileIdFromCoord, polygonFromTile, tileAreaKm2 } from './grid.js'`
   - Removed: Grid tile discovery and looping logic
   - Added: Direct territory creation from buffered path
   - Updated: Both POST `/` and POST `/sync` endpoints for new schema
   - Simplified stats update (count territories, sum distance_km for area)

3. **backend/src/territoryRoutes.js**
   - Removed: `import { tileIdFromCoord } from './grid.js'`
   - Removed: `/history/:tileId` endpoint (no ownership history needed)
   - Removed: `/context` POST endpoint (location-based tile queries)
   - Updated: GET `/` to query by run_id
   - Updated: GET `/mine-history` to filter by owner_id
   - Changed: `/info/:tileId` → `/info/:runId`

### Frontend
1. **src/components/RealTerritoryMap.tsx**
   - Removed: `import { polygonFromTile } from '@/lib/territory'`
   - Updated: Territory type definition
   - Updated: All three rendering paths (team, individual, filtered) to use `territory.run_id`
   - Updated: `handleTerritoryClick` to pass `runId` instead of `tileId`

2. **src/components/TerritoryInfoPanel.tsx**
   - Updated: Territory type (removed tile_id, strength)
   - Updated: Stats display (shows distance_km, activity_type, created_at)
   - Updated: Copy text to reflect run-based ownership

### Unchanged
- `backend/src/grid.js` - Still exists but no longer imported by run/territory routes
- `src/lib/territory.ts` - Still exists but `polygonFromTile()` no longer used
- GPS validation logic, Haversine distance calc, anti-cheat - all unchanged
- Territory rendering on maps - GeoJSON polygon display unchanged

## Testing Checklist

- [ ] Run submit creates one territory
- [ ] Territory geojson matches buffered path
- [ ] GET /territories returns all territories with correct fields
- [ ] GET /territories/mine-history shows your territories
- [ ] Click territory opens info panel with distance_km
- [ ] Sync endpoint creates multiple territories for offline runs
- [ ] User stats calculate correctly (sum of distance_km for area)
- [ ] No database errors on schema migration
- [ ] Frontend displays organic polygons correctly

## Key Benefits

🎯 **User Experience**
- Each run creates visible, unique territory
- Territory size = how far you ran (distance-based, not grid-based)
- Every run matters - creates permanent territory

🏗️ **Architecture**
- Simpler codebase: no grid tile logic needed
- Direct run↔territory mapping makes logic clearer
- Easier to add features (territory merging, overlays, etc.)

📊 **Data**
- Storage: run already stores geojson, territories reference it
- Queries: simpler (no tile intersection checks)
- Stats: easier to calculate (sum of distances)

## Migration Notes

- **Old data**: Existing territories with tile_ids won't appear until schema migration
- **Backward compatibility**: None - this is a breaking change
- **Grid.js**: Can be removed in future cleanup (still imports Turf for other uses)
- **Territory history**: No longer tracked (simple per-run ownership model)
