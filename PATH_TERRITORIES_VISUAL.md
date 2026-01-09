# Path-Based Territory System - Visual Guide

## Before vs After

### OLD SYSTEM: Grid Tiles 🟩🟩🟩
```
User runs 5km randomly through an area:

┌─────────────────────────────────────┐
│   Tile A     Tile B     Tile C      │  
│ ┌─────────┬─────────┬─────────┐    │
│ │ [OWNED] │ [OWNED] │ [OWNED] │    │
│ ├─────────┼─────────┼─────────┤    │
│ │ [OWNED] │  Empty  │ [OWNED] │    │  Running path: zigzag line
│ ├─────────┼─────────┼─────────┤    │
│ │ [OWNED] │ [OWNED] │ [OWNED] │    │
│ └─────────┴─────────┴─────────┘    │
└─────────────────────────────────────┘

Result: ~9 small square tiles captured
Problem: User runs randomly but tiles are fixed grid
         - Some runs miss tiles (wasted effort)
         - Two different paths → same tiles
         - Territory size = grid size, not run distance
```

### NEW SYSTEM: Path-Based Polygons 🏃‍♀️🗺️
```
User runs 5km randomly through an area:

┌─────────────────────────────────────┐
│                                     │
│        ╱──────╲╱─────╲            │
│       ╱          ╲ 5km Territory   │
│      ╱            ╲  (Buffered)    │
│     ╱              ╲                │
│    ╱                ╲               │
│   ╱                  ╲              │
│  ╱                    ╲             │
└─────────────────────────────────────┘

Result: 1 unique territory polygon
Benefit: Matches actual running path
         - Every run creates visible territory
         - Different paths → different territories
         - Territory size = how far you ran
```

## Running Journey - New System

### Example Run
```
GPS Points Collected:
  [40.1234, -74.5678]  Start location
  [40.1235, -74.5679]
  [40.1240, -74.5675]  (zigzag path)
  [40.1245, -74.5680]
  [40.1250, -74.5682]  End location
  ... etc ...

Step 1: Create LineString
  Line = [start, p2, p3, ..., end]

Step 2: Buffer the line (±50m)
  Buffered = LineString with 50m radius around it
  Creates polygon around running path

Step 3: Store as Territory
  {
    id: 42,
    run_id: 123,        # Link to this specific run
    owner_id: 5,        # Runner's user ID
    distance_km: 5.2,   # How far they ran
    activity_type: 'run',
    created_at: '2026-01-09T12:00:00Z',
    geojson: {
      type: "Polygon",
      coordinates: [
        [[lon, lat], [lon, lat], ... 50 points around buffered path]
      ]
    }
  }

Step 4: Display on Map
  Map renders geojson polygon in user's color
  Other users see this organic territory
```

## Comparison Table

| Aspect | Grid System | Path-Based System |
|--------|-----------|-------------------|
| **Territories per run** | Many (5-20 tiles) | One |
| **Shape** | Square | Organic (path shape) |
| **Size** | Fixed | Variable (by distance) |
| **Ownership** | Strength-based | Permanent |
| **Uniqueness** | Same path → same tiles | Different paths → different territories |
| **Visual** | Grid overlay | Flowing polygons |
| **Storage** | Tile ID string | run_id reference |
| **Queries** | Tile intersection checks | Direct run_id lookup |

## User Experience Flow

### Running a Route
```
1. User starts run with GPS enabled
2. App collects GPS points every few seconds
3. User finishes 5km run
4. Points sent to /api/runs POST endpoint
5. Backend:
   - Validates GPS points
   - Creates buffered polygon
   - Saves run
   - Creates territory from polygon
6. User sees: "Territory Created! 5km claimed 🏆"
7. Territory appears on map as colored polygon
```

### Viewing Territory
```
User taps on a colored polygon on the map:
1. Modal opens with territory info:
   - Owner: jane_doe
   - Distance: 5.2 km
   - Date: Jan 9, 2026
   - Activity: Running 🏃
2. Can see owner's avatar + username
3. Understands: "This was created from someone's 5km run"
```

### Building Territory Map
```
Multiple runners create territories over time:

Day 1: Alice runs 3km downtown
Day 2: Bob cycles 4km through park
Day 3: Carol runs 2km by riverfront
Day 4: Dave cycles 6km on trail

Map shows: 4 unique, colorful, organic territories
Each represents actual human movement
```

## Territory Strength Removal - Why?

**Old System**: Strength tracked how many times a tile was "claimed"
- Tile strength = 1, 2, 3, etc.
- Other user's strength-1 run could defeat it

**New System**: No strength concept
- Run #123 creates Territory #123
- Only one owner: user who created the run
- Simple, permanent, clear ownership

## Technical Details for Developers

### Creating a Territory
```javascript
// GPS points collected from user
const points = [
  { lat: 40.1234, lng: -74.5678, timestamp: 1000 },
  { lat: 40.1235, lng: -74.5679, timestamp: 2000 },
  // ... more points ...
];

// In backend:
const line = lineString(points.map(p => [p.lng, p.lat]));
const buffered = turfBuffer(line, 0.05, { units: 'kilometers' });
// buffered is now a Polygon GeoJSON

// Save to database:
INSERT INTO territories (run_id, owner_id, geojson, distance_km, activity_type)
VALUES (123, 5, buffered, 5.2, 'run');
```

### Fetching Territories
```javascript
// Get all territories
GET /api/territories?limit=500
Returns: [
  { id: 1, run_id: 123, owner_id: 5, owner_name: 'jane',
    distance_km: 5.2, activity_type: 'run', 
    geojson: {...} },
  // ... more territories ...
]

// Get user's territories
GET /api/territories/mine-history
Returns: All territories created by authenticated user

// Get specific territory details
GET /api/territories/123/info
Returns: Full territory with owner metadata
```

### Rendering on Map
```typescript
// Frontend - React Leaflet
territories.map(territory => (
  <Polygon
    key={territory.run_id}
    positions={
      territory.geojson.coordinates[0].map(
        ([lng, lat]) => [lat, lng]  // Flip for Leaflet
      )
    }
    pathOptions={{
      fillColor: colorByUser(territory.owner_id),
      color: 'darken(color)',
      fillOpacity: 0.4,
      weight: 2
    }}
    onClick={() => showTerritoryInfo(territory.run_id)}
  />
))
```

## Benefits Summary

✨ **For Users**
- See your run as beautiful territory on the map
- Territory size reflects effort (5km = larger territory)
- Every run counts equally
- Simple to understand: run → territory

⚡ **For Development**
- Simpler code (no grid logic)
- Faster queries (direct run_id lookup)
- Easier to extend (add overlaps, merging, etc.)
- Clear 1:1 mapping (run ↔ territory)

🎯 **For Games/Competitions**
- Leaderboards: by territory count or total area
- Challenges: "Run 50km total territory"
- Teams: sum of all member territories
- Events: "Claim territories in this zone"

## Glossary

- **LineString**: Turf.js geographic line from GPS points
- **Buffer**: Creates polygon around line (±50m from running path)
- **GeoJSON**: Standard format for storing geographic shapes
- **Polygon**: Closed shape with boundary coordinates
- **run_id**: Unique identifier for a single run (1:1 with territory)
- **Activity Type**: 'run' (🏃), 'cycle' (🚴), or other
