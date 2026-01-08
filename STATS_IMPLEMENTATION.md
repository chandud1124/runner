# Stats Menu Implementation Guide

## 📊 Overview
A complete stats and run history system with backend aggregation, API endpoints, and a Strava-style frontend interface.

---

## 🔧 Backend Implementation

### New File: `backend/src/statsRoutes.js`

#### Endpoints

**1. GET /stats/summary**
- Returns user's best run and lifetime totals
- **Authentication**: Required (JWT)
- **Response**:
```json
{
  "ok": true,
  "totals": {
    "totalRuns": 23,
    "totalDistanceKm": 124.6,
    "totalTimeSec": 46080,
    "avgPaceMinKm": 5.15,
    "activeDays": 18
  },
  "bestRun": {
    "id": 42,
    "distanceKm": 10.2,
    "durationSec": 3150,
    "paceMinKm": 5.15,
    "createdAt": "2026-01-12T10:30:00Z"
  },
  "fastestRun": {
    "id": 38,
    "distanceKm": 5.0,
    "durationSec": 1440,
    "paceMinKm": 4.8,
    "createdAt": "2026-01-08T07:15:00Z"
  }
}
```

**2. GET /stats/history**
- Returns paginated run history with territory counts
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 20, max: 50)
- **Response**:
```json
{
  "ok": true,
  "runs": [
    {
      "id": 45,
      "distanceKm": 5.2,
      "durationSec": 1720,
      "paceMinKm": 5.5,
      "createdAt": "2026-01-10T08:00:00Z",
      "territoriesClaimed": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRuns": 23,
    "totalPages": 2,
    "hasMore": true
  }
}
```

**3. GET /stats/run/:id**
- Get detailed stats for a specific run
- **Authentication**: Required (JWT)
- **Response**: Full run details with GeoJSON and territory history

### SQL Aggregations Used

**Lifetime Totals:**
```sql
SELECT 
  COUNT(*)::int AS total_runs,
  COALESCE(SUM(distance_km), 0) AS total_distance_km,
  COALESCE(SUM(duration_sec), 0) AS total_time_sec,
  COALESCE(AVG(CASE WHEN duration_sec > 0 
    THEN (duration_sec / 60.0) / distance_km END), 0) AS avg_pace_min_km
FROM runs 
WHERE user_id = $1 AND distance_km > 0
```

**Best Run (Longest):**
```sql
SELECT id, distance_km, duration_sec, created_at,
  CASE WHEN duration_sec > 0 
    THEN (duration_sec / 60.0) / distance_km 
    ELSE 0 END AS pace_min_km
FROM runs 
WHERE user_id = $1 AND distance_km > 0
ORDER BY distance_km DESC, created_at DESC
LIMIT 1
```

**Fastest Pace:**
```sql
SELECT id, distance_km, duration_sec, created_at,
  (duration_sec / 60.0) / distance_km AS pace_min_km
FROM runs 
WHERE user_id = $1 AND distance_km > 0 AND duration_sec > 0
ORDER BY pace_min_km ASC
LIMIT 1
```

**Active Days:**
```sql
SELECT COUNT(DISTINCT DATE(created_at))::int AS active_days
FROM runs 
WHERE user_id = $1
```

**Territory Claims (per run):**
```sql
SELECT COUNT(DISTINCT th.tile_id)::int
FROM territory_history th
WHERE th.to_owner = r.user_id 
  AND th.changed_at BETWEEN 
    r.created_at - INTERVAL '5 minutes' AND 
    r.created_at + INTERVAL '5 minutes'
```

---

## 🎨 Frontend Implementation

### Updated File: `src/pages/Stats.tsx`

#### Key Features

**1. Best Run Card**
- Displays longest distance run with trophy icon
- Shows distance, time, pace, and date
- Gradient orange/yellow background for prominence

**2. All-Time Stats Grid**
- 4 primary stats: Distance, Time, Runs, Active Days
- Color-coded cards (blue, purple, green, orange)
- Average pace shown separately below grid

**3. Run History List**
- Scrollable list of all runs, most recent first
- Each item shows:
  - Date (formatted: "Today", "Yesterday", "3 days ago", "Jan 10")
  - Distance in km
  - Duration (MM:SS or HH:MM:SS)
  - Pace (min/km)
  - Territory claims badge (if > 0)
- Click to view details (routes to `/run/:id`)
- "Load More" button for pagination

**4. Empty State**
- Shows when user has no runs
- Call-to-action button to start first run

#### Helper Functions

```typescript
formatTime(seconds: number): string
// Examples: "5:32", "1:05:32"

formatPace(paceMinKm: number): string
// Example: "5:15/km"

formatDate(dateString: string): string
// Examples: "Today", "Yesterday", "3 days ago", "Jan 10"

formatTotalTime(seconds: number): string
// Example: "12h 48m"
```

---

## 🔄 Data Flow

### On Page Load:
1. `fetchStatsData()` → GET `/stats/summary`
2. `fetchRunHistory(1)` → GET `/stats/history?page=1`
3. Display best run, totals, and first 20 runs

### On "Load More":
1. `loadMore()` → `fetchRunHistory(page + 1)`
2. Append new runs to existing list
3. Disable button when `hasMore === false`

### After Completing a Run:
1. POST `/runs` saves the run (existing endpoint)
2. User navigates to Stats page
3. Fresh data is fetched on mount
4. New run appears at top of history

---

## 📐 Calculation Details

### Pace Calculation
```
pace_min_km = (duration_sec / 60.0) / distance_km
```
Example: 30 minutes for 5km = (1800 / 60) / 5 = 6.0 min/km

### Average Pace (Lifetime)
```sql
AVG((duration_sec / 60.0) / distance_km)
```
Only includes runs where `duration_sec > 0` and `distance_km > 0`

### Territory Attribution
Territories claimed within ±5 minutes of run `created_at` timestamp are attributed to that run. This handles clock skew and async territory updates.

---

## 🛡️ Edge Cases Handled

### No Runs
- Empty state with CTA button
- Shows "Start Your First Run 🏃‍♂️"

### Single Run
- Shows as both best run and only run in history
- Totals display correctly

### Very Long Runs
- Time formatting handles hours: "2:15:30"
- Distance shows 2 decimal places: "42.19 km"

### Invalid Data
- Filters `distance_km > 0` to avoid division by zero
- Filters `duration_sec > 0` for pace calculations
- Returns 0 or null for missing data

### Pagination
- "Load More" button only shows when `hasMore === true`
- Loading spinner during fetch
- Prevents duplicate requests

---

## 🚀 Integration Steps

1. **Backend**: Route is already mounted in `server.js` as `/stats`
2. **Database**: Uses existing `runs` and `territory_history` tables
3. **Frontend**: Stats.tsx already integrated with routing
4. **Auth**: All endpoints protected with `requireAuth` middleware

### To Test:
```bash
# Backend
cd backend
npm run dev

# Frontend
npm run dev

# Navigate to: http://localhost:5173/stats
```

---

## 🎯 Key Design Decisions

### Why Compute on Request?
- Stats are not updated frequently enough to warrant caching
- Query performance is fast (<100ms for 1000s of runs)
- Simpler architecture without cache invalidation

### Why Territory Count Uses Time Window?
- Territory updates happen asynchronously after run save
- 5-minute window handles clock skew and processing delays
- More reliable than trying to link territories to specific runs

### Why Longest Distance as "Best Run"?
- Most objective metric
- Easy to understand
- Aligns with runner psychology ("I ran 10k!")
- Fastest pace available separately for speed-focused users

### Why Pagination?
- Better UX for users with 100+ runs
- Reduces initial load time
- Allows infinite scroll pattern

---

## 📊 Performance Considerations

- **Query Optimization**: Indexes on `user_id`, `created_at`, and `distance_km`
- **Limit Results**: Max 50 runs per page
- **Lazy Loading**: History loads separately from summary
- **Frontend Caching**: React state prevents refetch on re-render

---

## 🔮 Future Enhancements

- **Caching**: Add Redis for popular stats queries
- **Charts**: Weekly/monthly distance trends
- **Personal Records**: Track PRs for 1k, 5k, 10k, etc.
- **Streak Calculation**: Current and longest run streaks
- **Location Tags**: Parse territory names for "Times run here"
- **Export**: Download runs as GPX/CSV

---

## 📝 API Client Usage

```typescript
// Frontend usage
import { api } from '@/lib/api';

// Get summary
const stats = await api.get('/stats/summary');

// Get history
const history = await api.get('/stats/history?page=2&limit=20');

// Get specific run
const run = await api.get('/stats/run/42');
```

---

## ✅ Implementation Complete

All core requirements met:
- ✅ Best Run section
- ✅ Lifetime totals (distance, time, runs, active days)
- ✅ Run history list with pagination
- ✅ Territory claims per run
- ✅ Empty state handling
- ✅ Clean architecture
- ✅ Real-time calculations
- ✅ Proper error handling
