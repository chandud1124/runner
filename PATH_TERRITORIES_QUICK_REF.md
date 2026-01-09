# Path-Based Territories - Quick Reference

## 🔄 System Overview

**1 Run = 1 Territory (Path-Based)**

```
User runs → GPS points collected → Buffered polygon → Territory stored
```

## 📊 Database Schema

### territories table
```sql
id              SERIAL PRIMARY KEY
run_id          INTEGER UNIQUE NOT NULL (References runs(id))
owner_id        INTEGER (References users(id))
geojson         JSONB (Polygon with buffered path)
distance_km     NUMERIC (From the run)
activity_type   TEXT ('run', 'cycle', etc)
created_at      TIMESTAMPTZ
```

**What's gone**: tile_id, strength, last_claimed

## 🔗 API Endpoints - Quick Map

| Method | Endpoint | Purpose | Changes |
|--------|----------|---------|---------|
| POST | `/api/runs` | Submit run | Returns `{runId, territoryCreated: true}` |
| POST | `/api/runs/sync` | Batch runs | Creates N territories for N runs |
| GET | `/api/territories` | All territories | Query by ownerId |
| GET | `/api/territories/mine-history` | My territories | Filter by created_at |
| GET | `/api/territories/:runId/info` | Territory details | Use runId not tileId |

## 🛠️ Implementation Quick Fixes

### If you see `tile_id` errors:
```javascript
// ❌ OLD
const query = `SELECT * FROM territories WHERE tile_id = $1`;

// ✅ NEW
const query = `SELECT * FROM territories WHERE run_id = $1`;
```

### If you see `strength` errors:
```javascript
// ❌ OLD
territory.strength

// ✅ NEW  
territory.distance_km  // Use distance instead
```

### If fetching territory info:
```javascript
// ❌ OLD
await apiFetch(`/territories/${tileId}/info`);

// ✅ NEW
await apiFetch(`/territories/${runId}/info`);
```

### If rendering territories:
```javascript
// ❌ OLD
<Polygon key={territory.tile_id} ... />
onClick={() => handleClick(territory.tile_id)}

// ✅ NEW
<Polygon key={territory.run_id} ... />
onClick={() => handleClick(territory.run_id)}
```

## 📁 Files Changed

```
backend/
  ├── src/db.js                   # Schema update
  ├── src/runRoutes.js            # Run submission & sync
  └── src/territoryRoutes.js      # Territory queries

src/
  ├── components/RealTerritoryMap.tsx     # Rendering & clicking
  └── components/TerritoryInfoPanel.tsx   # Territory details modal
```

## 🧪 Testing Checklist

```
□ Run submission creates 1 territory
□ Territory geojson is valid polygon
□ GET /territories returns all territories
□ Sync creates N territories for N offline runs
□ Territory click opens correct details
□ Distance field shows km not strength
□ Activity type badge displays correctly
□ No database errors on startup
```

## 🚀 Quick Start Integration

### 1. Backend Setup
```bash
cd backend
npm install  # If needed
npm run dev  # Schema auto-migrates on startup
```

### 2. Verify Database
```sql
-- Check new schema
SELECT * FROM territories LIMIT 1;
-- Should see: id, run_id, owner_id, geojson, distance_km, activity_type, created_at
```

### 3. Test API
```bash
# Submit a test run
curl -X POST http://localhost:4000/api/runs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"points": [...], "distanceKm": 5.2, "durationSec": 1800}'

# Should return: { "ok": true, "runId": 123, "territoryCreated": true }
```

### 4. Verify Frontend
- Navigate to territory map
- Should see organic polygons (not grid squares)
- Click territory → info panel shows distance_km, created_at
- No errors in console about tile_id

## 💡 Common Issues & Fixes

### Issue: "Cannot read property 'tile_id'"
**Cause**: Code still trying to access removed field
**Fix**: Use `territory.run_id` or `territory.distance_km`

### Issue: Territory info not loading
**Cause**: Calling `/territories/:tileId/info` instead of `:runId/info`
**Fix**: Pass `territory.run_id` to the endpoint

### Issue: "strength is undefined"
**Cause**: UI component trying to display strength stat
**Fix**: Show `distance_km` instead, or activity_type badge

### Issue: Database migration fails
**Cause**: Schema hasn't updated
**Fix**: Restart backend - `ensureSchema()` runs on startup

## 📚 Related Docs

- [PATH_BASED_TERRITORIES.md](PATH_BASED_TERRITORIES.md) - Full system overview
- [PATH_TERRITORIES_VISUAL.md](PATH_TERRITORIES_VISUAL.md) - Visual examples
- [GPS_TERRITORY_SYSTEM.md](GPS_TERRITORY_SYSTEM.md) - GPS logic (unchanged)

## 🎯 Key Principle

> **One run creates exactly one territory polygon that matches the buffered running path.**

Everything flows from this simple rule:
- No tile discovery needed
- No strength tracking needed  
- No conquest logic needed
- Cleaner code, happier users

---

**Last Updated**: January 9, 2026
**System**: Path-Based Territories v1.0
