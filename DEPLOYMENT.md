# Cloud Deployment Guide

Deploy Territory Runner to **Vercel** (frontend) + **Render** (backend) + **Supabase** (database).

## Prerequisites

- GitHub account with repository pushed ✓
- Vercel account (free tier)
- Render account (free tier)
- Supabase account (free tier)

## Step 1: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) → Sign up / Log in
2. Create a new project
3. Copy the **PostgreSQL connection string** from Settings → Database → Connection string (URI)
4. Keep it safe; you'll need it for both Render and local development

## Step 2: Deploy Backend to Render

### Create Render Service

1. Go to [render.com](https://render.com) → Sign up / Log in
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `territory-runner-api`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm run dev`
   - **Plan**: Free (or Starter for better uptime)

### Add Environment Variables

Click **Add Environment Variable** for each:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase PostgreSQL connection string |
| `JWT_SECRET` | Generate a random 32+ character string (use `openssl rand -base64 32`) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `REDIS_URL` | `redis://localhost:6379` (or omit; Redis is optional) |

### Deploy

Click **Deploy**. Wait 5–10 minutes for the backend to build and start.

Once live, note your **Render API URL**: `https://territory-runner-api.onrender.com`

## Step 3: Deploy Frontend to Vercel

### Create Vercel Project

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework**: `Vite`
   - **Root Directory**: `.` (root of repo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Add Environment Variables

Click **Environment Variables** and add:

| Key | Value | Environments |
|-----|-------|--------------|
| `VITE_API_URL` | `https://territory-runner-api.onrender.com` | Production |
| `VITE_API_URL` | `http://localhost:4000` | Development |
| `VITE_MOBILE_BUILD` | `false` | All |

### Deploy

Click **Deploy**. Wait 2–5 minutes.

Once live, your app is at: `https://territory-runner-xxx.vercel.app`

## Step 4: Mobile Build (Optional)

For Android/iOS apps, rebuild with production API:

```bash
VITE_API_URL=https://territory-runner-api.onrender.com npm run build
npx cap sync
# Then open in Android Studio or Xcode to build APK/IPA
```

## Step 5: Verify Deployment

1. **Test Frontend**: Visit your Vercel URL → Sign up / Log in → Start a run
2. **Test API**: Visit `https://territory-runner-api.onrender.com/health`
3. **Check Database**: Territories and runs should save in Supabase

## Troubleshooting

### Backend won't start
- Check Render logs: Dashboard → territory-runner-api → Logs
- Verify `DATABASE_URL` is correct and Supabase is running
- Ensure `JWT_SECRET` is set

### Frontend can't reach API
- Verify `VITE_API_URL` is set to your Render URL
- Check CORS: API should allow `https://territory-runner-xxx.vercel.app`
- Backend has CORS enabled by default; if issues persist, check `backend/src/server.js`

### Mobile app can't reach API
- Use `VITE_MOBILE_API_URL` with HTTPS (not HTTP) for production
- Verify Render backend is responding: `curl https://territory-runner-api.onrender.com/health`
- Android may block cleartext; always use HTTPS in production

## Performance Tips

- **Vercel**: Auto-scales; no action needed
- **Render**: Free tier sleeps after 15 min inactivity; upgrade to Starter for always-on
- **Supabase**: Free tier includes 500 MB database; monitor usage in dashboard
- **Caching**: Frontend assets cached globally; backend caches territories in memory

## Next Steps

1. **Monitor**: Set up error tracking (Sentry, LogRocket)
2. **Analytics**: Add Mixpanel or Plausible for GPS/run insights
3. **HTTPS**: Both Render and Vercel provide free HTTPS
4. **Custom Domain**: Bind your domain to Vercel (Settings → Domains)

## Rollback

If deployment breaks:
1. **Vercel**: Deployments tab → Select previous deployment → Promote
2. **Render**: Re-push to main branch or manually trigger redeploy

---

**Your app is now live on the cloud!** 🚀
