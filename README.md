# Territory Runner

A GPS-accurate territory conquest running and cycling app where users claim real-world territory by running.

**Core Concept**: 1 km run in real world = 1 km on map (Haversine formula, ±0.5% accuracy)

## Quick Start

### Prerequisites
- Node.js 16+ & npm
- PostgreSQL 13+

### Local Development

**Frontend**:
```sh
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

**Backend** (separate terminal):
```sh
cd backend
npm install
cp .env.example .env  # Edit DATABASE_URL, JWT_SECRET
npm run dev  # Node --watch on http://localhost:4000
```

### Mobile Apps (Android/iOS)

```sh
npm run build          # Build web assets
npx cap sync           # Sync to native projects
npm run mobile:android # Open in Android Studio
npm run mobile:ios     # Open in Xcode (macOS only)
```

See [MOBILE_QUICK_START.md](MOBILE_QUICK_START.md) for complete setup.
