# Path-Based Territory System

## Overview
TerritoryRunner now uses an **organic, path-based territory system** instead of fixed grid tiles. Each run automatically creates a unique territory polygon based on the exact path the user ran.

## Key Changes

### What Changed
- **Old System**: GPS runs were split into multiple fixed square grid tiles (geohashing)
- **New System**: Each run creates ONE unique territory from the buffered running path

### Territory Creation Process
1. User completes a run with GPS points
2. Backend validates GPS points (anti-cheat checks)
3. Run path is buffered ±50m (using Turf.js `buffer()`)
4. **Buffered polygon becomes the territory** - stored with the run
5. Territory is owned by the runner indefinitely

### Database Structure

**territories table:**
```
id           - Primary key
run_id       - Foreign key to the run (unique)
owner_id     - User who created the territory
geojson      - The buffered polygon from the run path
distance_km  - Distance of the run
activity_type - 'run', 'cycle', etc.
created_at   - When territory was created
```

### Benefits

✅ **Unique territories** - No two users can create the exact same territory (different paths)
✅ **Visual appeal** - Territories follow actual running paths, not grid squares
✅ **Fair ownership** - Each territory belongs to one specific run by one user
✅ **Simpler logic** - No tile strength/conquest system - you own your run's territory
✅ **Complete coverage** - Every run instantly creates visible territory

### API Endpoints

#### Get All Territories
```
GET /api/territories
Query params:
  - limit: max results (default 500)
  - ownerId: filter by user
```

#### Get User's Territories
```
GET /api/territories/mine-history
Query params:
  - limit: max results
  - activityType: 'run' or 'cycle'
  - cursor: pagination timestamp
```

#### Get Territory Details
```
GET /api/territories/:runId/info
Returns: Territory info with owner, distance, run date
```

### Frontend Display

Territories should be rendered as **GeoJSON polygons** on Leaflet:
- Use `territory.geojson` directly
- Color by `territory.owner_id` or activity type
- Show owner name, distance, and date on click

### Example Territory Object
```javascript
{
  id: 42,
  run_id: 123,
  owner_id: 5,
  owner_name: "jane_doe",
  geojson: {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[...path points...]]
      }
    }]
  },
  distance_km: 5.2,
  activity_type: "run",
  created_at: "2026-01-09T12:34:56Z"
}
```

### Running the System

1. User completes a run with 50+ valid GPS points
2. Frontend sends points to `/api/runs` POST endpoint
3. Backend:
   - Validates points (speed, accuracy)
   - Creates lineString from coordinates
   - Buffers it ±50m using Turf.js
   - Inserts run + territory in one transaction
4. Response includes `runId` and `territoryCreated: true`

### Anti-Cheat Checks
- Validates max speed (10 m/s)
- Checks GPS accuracy
- Confirms 1km run = 1km on ground (Haversine)
- Rejects impossible paths

## Migration Notes

If upgrading from the tile-based system:
1. Old `territory_history` and `territory_claims` tables can be archived
2. Existing territories table auto-migrates via schema migration
3. User stats are now recalculated based on owned territories
4. No need to keep geohash tile calculations

## Future Enhancements

- Territory overlap detection (visualize contested areas)
- Territory merging when same user runs through existing territory
- Leaderboards by total territory area owned
- Territory battles (highest strength wins area)
