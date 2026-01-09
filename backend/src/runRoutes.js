import express from 'express';
import { lineString, length as turfLength, buffer as turfBuffer } from '@turf/turf';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { validateRunSubmission } from './antiCheat.js';
import { getRedisClient, isRedisAvailable } from './server.js';

const router = express.Router();
const BUFFER_KM = 0.05; // ~50m buffer around path

// Helper function to safely use Redis
const redisDel = async (pattern) => {
  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      await redis.del(pattern);
    }
  } catch (err) {
    console.warn('Redis del failed:', err.message);
  }
};

// GET /runs - Fetch recent runs
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const { rows } = await pool.query(
      'SELECT id, user_id, geojson, distance_km, duration_sec, created_at, raw_points FROM runs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return res.json({ runs: rows });
  } catch (error) {
    console.error('Fetch runs error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch runs' });
  }
});

// Get single run by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, user_id, geojson, distance_km, duration_sec, created_at, raw_points, activity_type FROM runs WHERE id = $1',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Run not found' });
    }
    
    return res.json({ ok: true, run: rows[0] });
  } catch (error) {
    console.error('Fetch run error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch run' });
  }
});

function validateRun(points = []) {
  if (!Array.isArray(points) || points.length < 2) return 'At least two points required';
  for (const p of points) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return 'Invalid lat/lng';
  }
  return null;
}

function maxSegmentSpeed(points) {
  let max = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dt = (b.timestamp && a.timestamp) ? (b.timestamp - a.timestamp) / 1000 : null;
    if (!dt || dt <= 0) continue;
    const dx = haversine(a, b); // meters
    const speed = dx / dt;
    if (speed > max) max = speed;
  }
  return max;
}

function haversine(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { points = [], distanceKm, durationSec, activityType = 'run' } = req.body || {};
    console.log(`[RUN] User ${req.userId} submitting ${activityType} with ${points.length} points, ${distanceKm}km`);
    
    // Comprehensive anti-cheat validation
    const validation = validateRunSubmission(points, activityType);
    
    if (!validation.valid) {
      console.log(`[RUN] Validation failed:`, validation.errors);
      return res.status(400).json({ 
        ok: false, 
        error: validation.errors.join('. '),
        warnings: validation.warnings,
        stats: validation.stats
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log(`[RUN] Warnings detected:`, validation.warnings);
    }
    
    console.log(`[RUN] Validation passed - Max speed: ${(validation.stats.maxSpeed * 3.6).toFixed(1)} km/h, Avg accuracy: ${validation.stats.avgAccuracy?.toFixed(1)}m`);

    // Create buffered path from GPS points
    const line = lineString(points.map((p) => [p.lng, p.lat]));
    const computedDistance = distanceKm ?? turfLength(line, { units: 'kilometers' });
    const bufferedTerritory = turfBuffer(line, BUFFER_KM, { units: 'kilometers' });

    console.log(`[RUN] Creating organic territory from path: ${computedDistance.toFixed(2)}km with ${points.length} GPS points`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert run with buffered path as geojson
      const runInsert = await client.query(
        `INSERT INTO runs (user_id, geojson, distance_km, duration_sec, activity_type, validation_status, raw_points, max_speed, avg_accuracy) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          req.userId, 
          bufferedTerritory, 
          computedDistance, 
          durationSec ?? null,
          activityType,
          JSON.stringify(validation),
          JSON.stringify(points),
          validation.stats.maxSpeed,
          validation.stats.avgAccuracy || null
        ]
      );
      const runId = runInsert.rows[0].id;

      // Create one organic territory from the entire run path
      await client.query(
        `INSERT INTO territories (run_id, owner_id, geojson, activity_type, distance_km, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [runId, req.userId, bufferedTerritory, activityType, computedDistance]
      );

      console.log(`[RUN] Territory created: run_id=${runId}, owner=${req.userId}, distance=${computedDistance.toFixed(2)}km`);

      // Update user stats
      await client.query(
        `INSERT INTO user_stats (user_id, total_distance_km, territories_owned, area_km2)
         VALUES ($1, $2, 1, $2)
         ON CONFLICT (user_id) DO UPDATE SET 
           total_distance_km = user_stats.total_distance_km + $2,
           territories_owned = user_stats.territories_owned + 1,
           area_km2 = user_stats.area_km2 + $2,
           updated_at = NOW()`,
        [req.userId, computedDistance]
      );

      // Update team stats if user is in a team
      const { rows: teamRows } = await client.query(
        'SELECT team_id FROM team_members WHERE user_id = $1 AND status = $2',
        [req.userId, 'active']
      );
      
      if (teamRows.length > 0) {
        const teamId = teamRows[0].team_id;
        
        // Update team_member_stats
        await client.query(
          `INSERT INTO team_member_stats (team_id, user_id, distance_contributed_km, runs_contributed, territories_contributed)
           VALUES ($1, $2, $3, 1, 1)
           ON CONFLICT (team_id, user_id) DO UPDATE SET
             distance_contributed_km = team_member_stats.distance_contributed_km + $3,
             runs_contributed = team_member_stats.runs_contributed + 1,
             territories_contributed = team_member_stats.territories_contributed + 1`,
          [teamId, req.userId, computedDistance]
        );

        // Log run completion to team feed
        const { addTeamActivity } = await import('./teamRoutes.js');
        await addTeamActivity(client, teamId, req.userId, 'run_completed', {
          distance_km: computedDistance,
          duration_sec: durationSec,
          territory_created: true
        });

        // Update any active challenges
        await client.query(
          `UPDATE team_challenges 
           SET current_value = current_value + $1,
               status = CASE 
                 WHEN (current_value + $1) >= target_value THEN 'completed'
                 ELSE status 
               END
           WHERE team_id = $2 AND status = 'active' AND type = 'distance'`,
          [computedDistance, teamId]
        );

        // Check for newly completed challenges
        const { rows: completedChallenges } = await client.query(
          `SELECT * FROM team_challenges 
           WHERE team_id = $1 AND status = 'completed' 
           AND updated_at >= NOW() - INTERVAL '5 seconds'`,
          [teamId]
        );

        for (const challenge of completedChallenges) {
          await addTeamActivity(client, teamId, req.userId, 'challenge_completed', {
            challenge_id: challenge.id,
            title: challenge.title,
            type: challenge.type
          });
        }
      }

      await client.query('COMMIT');

      // Invalidate territory caches
      await redisDel('territories:all:*');
      await redisDel(`territories:${req.userId}:*`);

      return res.json({ ok: true, runId, territoryCreated: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Run ingest failed:', err);
      return res.status(500).json({ ok: false, error: 'Run ingest failed' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Run error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Batched sync endpoint for offline runs
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { runs = [] } = req.body || {};
    console.log(`[SYNC] User ${req.userId} syncing ${runs.length} runs`);

    if (!Array.isArray(runs) || runs.length === 0) {
      return res.json({ ok: true, syncedRuns: [] });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const syncedRuns = [];
      for (let i = 0; i < runs.length; i++) {
        try {
          const runData = runs[i];
          const { points, distanceKm, durationSec, activityType = 'run' } = runData;

          console.log(`[SYNC] Processing run ${i + 1}/${runs.length}: ${points?.length || 0} points`);

          // Re-validate server-side
          const validation = validateRunSubmission(points, activityType);
          if (!validation.valid) {
            console.log(`[SYNC] Validation failed for run ${i + 1}:`, validation.errors);
            continue; // Skip invalid runs
          }

          // Create buffered path from GPS points
          const line = lineString(points.map((p) => [p.lng, p.lat]));
          const computedDistance = distanceKm ?? turfLength(line, { units: 'kilometers' });
          const bufferedTerritory = turfBuffer(line, BUFFER_KM, { units: 'kilometers' });

          const runInsert = await client.query(
            `INSERT INTO runs (user_id, geojson, distance_km, duration_sec, activity_type, validation_status, raw_points, max_speed, avg_accuracy) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              req.userId, 
              bufferedTerritory, 
              computedDistance, 
              durationSec ?? null,
              activityType,
              JSON.stringify(validation),
              JSON.stringify(points),
              validation.stats.maxSpeed,
              validation.stats.avgAccuracy || null
            ]
          );
          const runId = runInsert.rows[0].id;
          console.log(`[SYNC] Inserted run ${runId} for user ${req.userId}`);

          // Create territory from the entire run path
          await client.query(
            `INSERT INTO territories (run_id, owner_id, geojson, activity_type, distance_km, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [runId, req.userId, bufferedTerritory, activityType, computedDistance]
          );

          // Update user stats
          await client.query(
            `INSERT INTO user_stats (user_id, total_distance_km, territories_owned, area_km2)
             VALUES ($1, $2, 1, $2)
             ON CONFLICT (user_id) DO UPDATE SET 
               total_distance_km = user_stats.total_distance_km + $2,
               territories_owned = user_stats.territories_owned + 1,
               area_km2 = user_stats.area_km2 + $2,
               updated_at = NOW()`,
            [req.userId, computedDistance]
          );

          syncedRuns.push({ runId, territoryCreated: true });
        } catch (runErr) {
          console.error(`[SYNC] Error processing run ${i + 1}:`, runErr);
          // Continue with next run instead of failing entire sync
        }
      }

      await client.query('COMMIT');
      console.log(`[SYNC] Successfully synced ${syncedRuns.length}/${runs.length} runs for user ${req.userId}`);

      // Invalidate territory caches
      await redisDel('territories:all:*');
      await redisDel(`territories:${req.userId}:*`);

      return res.json({ ok: true, syncedRuns });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[SYNC] Transaction failed:', err);
      console.error('[SYNC] Error stack:', err.stack);
      return res.status(500).json({ ok: false, error: 'Sync failed', details: err.message });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
