# Territory Runner

A GPS-accurate territory conquest running and cycling app where users claim real-world territory by running.

**Core Concept**: 1 km run in real world = 1 km on map (Haversine formula, ±0.5% accuracy)

## 🤖 Built with AI Tools

This entire application was **completely built using AI tools** and successfully **completed in 3-4 days (72-96 hours)** of development time. The project demonstrates the power of AI-assisted development for full-stack applications including:
- Complete frontend (React/Vite/TypeScript)
- Full backend (Node.js/Express)
- Mobile apps (Capacitor for iOS/Android)
- Database design and optimization
- Cloud deployment and DevOps

## 🚀 Live Application & Cloud Deployment

### Access the Live App

**URL**: [Territory Runner - Live Demo](https://territoryrunner.vercel.app)

### Cloud Infrastructure

The application is deployed across multiple cloud platforms:

#### Frontend
- **Host**: [Vercel](https://vercel.com)
- **Framework**: React + Vite + TypeScript
- **URL**: https://territoryrunner.vercel.app
- **Auto-deployed** from main branch

#### Backend API
- **Host**: [Render](https://render.com) (Free Tier)
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (Render managed)
- **Environment**: Free plan with automatic hibernation

### ⚠️ Important Notes About Free Tier Hosting

Since the application is hosted on **free tier cloud services**:

1. **Initial Load Time**: First access may take 30-60 seconds as services wake up from hibernation
2. **Cold Starts**: The backend may take up to 2 minutes on first request after inactivity
3. **Refresh**: If the app doesn't load, refresh the page and wait patiently
4. **Availability**: Services are active but may have brief startup delays on free plans

**Recommendation**: For production use, upgrade to paid tiers for guaranteed uptime and instant responsiveness.

### How to Use the Application

#### 1. **Getting Started**
   - Visit [Territory Runner App](https://territory-runner-ai.vercel.app)
   - Sign up with your email and password
   - Create your profile with a username

#### 2. **Recording a Run**
   - Enable location services on your device
   - Click "Start Run" on the home page
   - The app will track your GPS location in real-time
   - Run/cycle through your area to claim territory
   - The map shows claimed areas in real-time

#### 3. **Territory Claiming**
   - Each 1 km you run = 1 km of territory claimed on the map
   - Your territory is shown in your profile color
   - View territories you've conquered in your profile
   - Compete with other users for total territory controlled

#### 4. **Features**
   - **Live Map**: See real-time territory ownership
   - **Profile**: View your stats, distance, territories claimed
   - **Leaderboard**: Rank against other runners
   - **Social**: Follow friends and see their runs
   - **Teams**: Join or create teams to compete together
   - **Competitions**: Participate in limited-time challenges

#### 5. **Mobile Apps** (Coming Soon)
   - Download Android/iOS apps from app stores
   - Same functionality with native GPS access
   - Offline run support with sync when online

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
