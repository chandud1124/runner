# Territory Details Panel - Complete Feature Guide

## What You Now Get When Clicking a Territory

When you click on any territory polygon on the map, you'll see a comprehensive details panel with:

### 1. **Territory Creator Info** 👤
- Name of the person who created this territory
- Avatar with their initials
- Badge showing "You" if it's your territory

### 2. **Territory Statistics** 📊
- **Distance Run** - How many km the creator ran
- **Time Taken** - How long the run took (hours:minutes format)
- **Area Covered** - Total geographic area in m²
- **Activity Type** - Was it 🏃 Running or 🚴 Cycling?
- **Created Date** - When this territory was created

### 3. **Activity in This Area** 👥
Quick summary showing:
- **Recent runs nearby** - Total number of runs in this general area (last 30 days)
- **Times you ran here** - How many times YOU specifically ran in this location
- **Other runners** - How many different people have run here

### 4. **Top Performers (Last 30 Days)** 🏆
A leaderboard showing:
- **Rank** - 🥇 1st, 🥈 2nd, 🥉 3rd place, etc.
- **Runner Name** - Who the top performer is
- **Distance** - How much they ran
- **Runs** - How many times they ran here
- **Best Pace** - Fastest time per km (mm:ss/km format)

**Example:**
```
🥇 Alice Johnson
   5 runs • 23.4 km
   5:32/km

🥈 Bob Smith  
   3 runs • 18.7 km
   5:45/km

🥉 Carol Lee
   2 runs • 12.1 km
   6:02/km
```

### 5. **Who Else Ran Here** 🏃‍♀️
Expandable list showing:
- Recent runners in this area
- Their distance for that run
- Activity type (running or cycling)
- Date they ran

You can scroll through up to 15 recent runs, and if there are more, it shows "+N more runners"

---

## How to Use It

### To See Territory Details:
1. Open the territory map
2. Click on any colored polygon (territory)
3. The details panel slides up from the bottom
4. Scroll through different sections

### To Expand/Collapse Sections:
- Click the section header arrow (▶ / ▼)
- Sections can be expanded/collapsed independently
- Useful for focusing on what interests you

### Sections You Can Toggle:
- Activity in This Area
- Top Performers  
- Who Else Ran Here

---

## Real-World Examples

### Example 1: Central Park Territory
```
Territory Creator: Sarah Chen
- Distance: 8.5 km
- Time: 52 minutes
- Activity: Running
- Area: 2,450,000 m²

Activity Summary:
- 47 recent runs nearby
- You ran here 3 times
- 12 other runners

Top Performers:
🥇 Jake Miller - 85 km (11 runs)
🥈 Emma Stone - 62 km (8 runs)
🥉 David Park - 44 km (6 runs)
```

### Example 2: Riverside Trail Territory
```
Territory Creator: Tom Wilson
- Distance: 6.2 km
- Time: 38 minutes
- Activity: Cycling
- Area: 1,890,000 m²

Activity Summary:
- 23 recent runs nearby
- You ran here 1 time (5.8 km)
- 8 other runners

Top Performers:
🥇 Lisa Chen - 42 km (6 cycles)
🥈 Alex Rodriguez - 38 km (5 cycles)
🥉 Maria Santos - 31 km (4 cycles)
```

---

## What This Tells You

### For Motivation 🎯
- See how others perform on similar routes
- Compare your distance/pace with others
- Identify popular running areas
- Set personal goals based on top performers

### For Community 🤝
- See who's active in your area
- Discover other runners/cyclists
- Understand local running culture
- Find potential running partners

### For Competition 🏆
- Check leaderboards by area
- See your ranking in popular areas
- Track improvement over time
- Challenge others in specific territories

### For Planning 📍
- Identify high-traffic running areas
- Find new routes near popular territories
- Understand distance patterns
- Plan group runs based on activity

---

## Data Shown

### For Each Territory:
- Exact distance the creator ran
- Time they spent running
- Geographic area covered
- When it was created
- Activity type (run vs cycle)

### For Each Performer:
- Total distance across all runs
- Number of runs completed
- Average distance per run
- Best pace achieved
- Username/avatar

### For Other Runners:
- Their distance for specific runs
- Activity type
- Date of run
- Username

---

## Performance Features

- **Fast Loading** - Details fetch in background while you read
- **Scrollable Lists** - Up to 15 recent runs visible at once
- **Expandable Sections** - Collapse unused sections to save space
- **Responsive Design** - Works on phone, tablet, desktop

---

## Technical Details

### API Endpoint Used:
```
GET /api/territories/:runId/info
```

### Data Returned:
```json
{
  "ok": true,
  "territory": {
    "id": 42,
    "run_id": 123,
    "owner_id": 5,
    "owner_name": "Sarah Chen",
    "distance_km": 8.5,
    "run_duration": 3120,
    "activity_type": "run",
    "created_at": "2026-01-09T14:30:00Z",
    "geojson": {...}
  },
  "overlappingTerritories": [
    {
      "run_id": 120,
      "owner_id": 8,
      "owner_name": "Jake Miller",
      "distance_km": 7.2,
      "activity_type": "run",
      "created_at": "2026-01-08T10:00:00Z"
    },
    // ... more runs ...
  ],
  "topPerformers": [
    {
      "id": 8,
      "username": "Jake Miller",
      "run_count": 11,
      "total_distance": 85,
      "avg_distance": 7.73,
      "best_pace_sec_per_km": 300
    },
    // ... more performers ...
  ],
  "stats": {
    "totalTerritoriesNearby": 47,
    "topPerformerCount": 10
  }
}
```

---

## Future Enhancements

Potential features to add:
- [ ] Filter top performers by activity type
- [ ] View runner profile by clicking on name
- [ ] Direct message other runners
- [ ] Join local running groups
- [ ] Export territory leaderboard
- [ ] Compare your stats vs top performer
- [ ] Route playback (see exact path runner took)

---

## Summary

✨ **The territory details panel gives you a complete view of:**
1. Who created this territory
2. How they performed
3. Who else ran nearby
4. Rankings and comparisons
5. Community activity in this area

All from a single click on the map! 🗺️

---

**Status**: ✅ **Complete and Ready**
**Date**: January 9, 2026
**Feature**: Rich Territory Information Panel
