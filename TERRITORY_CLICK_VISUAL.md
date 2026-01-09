# Territory Click Details - Visual Summary

## What Happens When You Click a Territory

```
┌─────────────────────────────────────────────────────┐
│  You click on a territory polygon on the map        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ Details Panel Slides Up    │
        │ from Bottom (85vh height)  │
        └────────────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────┐
    │ Owner Info  │              │ Stats Card   │
    │             │              │              │
    │ Sarah Chen  │              │ 8.5 km ✓     │
    │ 🏆 Your run │              │ 52 min ✓     │
    └─────────────┘              │ 🏃 Running   │
                                 └──────────────┘
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌─────────────────────┐      ┌──────────────────────┐
│ Activity Summary    │      │ Top Performers       │
│                     │      │ (Leaderboard)        │
│ • 47 runs nearby    │      │                      │
│ • You: 3 times ✓    │      │ 🥇 Jake (85 km)     │
│ • Others: 12        │      │ 🥈 Emma (62 km)     │
│                     │      │ 🥉 David (44 km)    │
└─────────────────────┘      └──────────────────────┘
         │
         ▼
    ┌──────────────────────────────────┐
    │ Who Else Ran Here (Scrollable)   │
    │                                  │
    │ Jake Miller      7.2 km  Jan 8  │
    │ Emma Stone       6.8 km  Jan 7  │
    │ David Park       5.5 km  Jan 6  │
    │ ... (scrollable list)            │
    └──────────────────────────────────┘
```

## Panel Layout

```
┌──────────────────────────────────────────────────────┐
│  🗺 Territory Details                                │
│  Complete information about this territory           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🏆 This is your territory!                          │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 Territory Creator                        │   │
│  │                                             │   │
│  │  [Avatar] Sarah Chen                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚡ Territory Stats                          │   │
│  │                                             │   │
│  │  Distance Run:        8.5 km                │   │
│  │  Time Taken:          52m 15s               │   │
│  │  Area Covered:        2,450,000 m²          │   │
│  │  Activity Type:       🏃 Running            │   │
│  │  Created:             Jan 9, 26             │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👥 Activity in This Area ▼                  │   │
│  │                                             │   │
│  │  Recent runs nearby:     47                 │   │
│  │  Times you ran here:     3 ✓                │   │
│  │  Other runners:          12                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 📈 Top Performers (Last 30 Days) ▼         │   │
│  │                                             │   │
│  │  🥇 Jake Miller                             │   │
│  │     8 runs • 85.0 km                        │   │
│  │     5:32/km                                 │   │
│  │                                             │   │
│  │  🥈 Emma Stone                              │   │
│  │     6 runs • 62.0 km                        │   │
│  │     5:48/km                                 │   │
│  │                                             │   │
│  │  🥉 David Park                              │   │
│  │     5 runs • 44.0 km                        │   │
│  │     6:15/km                                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👥 Who Else Ran Here ▼                      │   │
│  │                                             │   │
│  │  [Avatar] Jake Miller    7.2 km  Jan 8    │   │
│  │  [Avatar] Emma Stone     6.8 km  Jan 7    │   │
│  │  [Avatar] Carol Lee      5.5 km  Jan 6    │   │
│  │  [Avatar] Alex Chen      8.1 km  Jan 5    │   │
│  │                                             │   │
│  │  + 3 more runners                           │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  🌟 This territory was created from your epic run! │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Interactive Features

### Section Toggle
```
Click the ▶ arrow to expand any section:

  Activity in This Area ▶         [Collapsed]
  Activity in This Area ▼         [Expanded]
    • Recent runs nearby: 47
    • Times you ran here: 3
    • Other runners: 12
```

### Scrollable Lists
```
If more than 15 runs shown:

Who Else Ran Here:
  [Showing 1-15 of 47 runs]
  
  Jake Miller      7.2 km  Jan 8
  Emma Stone       6.8 km  Jan 7
  David Park       5.5 km  Jan 6
  ... (scroll to see more)
  
  +32 more runners
```

## Data Display Examples

### For Running Territory:
```
Territory Creator: Sarah Chen
Distance Run:     8.5 km
Time Taken:       52m 15s
Area Covered:     2,450,000 m²
Activity Type:    🏃 Running
Created:          Jan 9, 2026

Top Performers:
🥇 Jake Miller - 11 runs, 85 km, 5:32/km
```

### For Cycling Territory:
```
Territory Creator: Tom Wilson
Distance Run:     12.4 km
Time Taken:       38m 45s
Area Covered:     3,120,000 m²
Activity Type:    🚴 Cycling
Created:          Jan 8, 2026

Top Performers:
🥇 Lisa Chen - 6 runs, 42 km, 15 km/h avg
```

## What Each Section Shows

| Section | Shows | Type |
|---------|-------|------|
| Territory Creator | Name, avatar, badge | Static |
| Territory Stats | Distance, time, area, type, date | Static |
| Activity Summary | Total runs, your runs, other runners | Dynamic |
| Top Performers | Leaderboard of best runners | Dynamic |
| Who Else Ran Here | Recent runs by different users | Dynamic/Scrollable |

## Interaction Flow

```
User Action → Panel Update → Display Results
────────────   ──────────────   ───────────

Click territory
    │
    ▼
Load basic info
    │
    ▼
Show panel with territory stats
    │
    ▼
Fetch overlapping territories (background)
    │
    ▼
Fetch top performers (background)
    │
    ▼
Populate "Who Else Ran Here" list
    │
    ▼
Populate "Top Performers" leaderboard
    │
    ▼
Panel fully interactive
```

## Responsiveness

### Mobile View (80vh height)
```
Everything stacked vertically
All sections visible when scrolling
Avatar circles properly sized
Text readable on small screens
```

### Tablet View (85vh height)
```
Balanced spacing
Section cards readable
Leaderboard shows 3-5 entries at once
```

### Desktop View (85vh height)
```
Full details visible
More entries visible without scrolling
Better use of horizontal space
Comfortable reading experience
```

---

**Feature**: Rich Territory Information Panel
**Status**: ✅ Complete
**Date**: January 9, 2026
