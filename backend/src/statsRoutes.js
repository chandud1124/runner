import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';

const router = express.Router();

/**
 * GET /stats/summary
 * Returns user's best run and lifetime totals
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Get lifetime totals
    const { rows: totalsRows } = await pool.query(
      `SELECT 
        COUNT(*)::int AS total_runs,
        COALESCE(SUM(distance_km), 0) AS total_distance_km,
        COALESCE(SUM(duration_sec), 0) AS total_time_sec,
        COALESCE(AVG(CASE WHEN duration_sec > 0 THEN (duration_sec / 60.0) / distance_km END), 0) AS avg_pace_min_km
      FROM runs 
      WHERE user_id = $1 AND distance_km > 0`,
      [userId]
    );

    const totals = totalsRows[0];

    // Get best run (longest distance)
    const { rows: bestRunRows } = await pool.query(
      `SELECT 
        id,
        distance_km,
        duration_sec,
        created_at,
        CASE WHEN duration_sec > 0 THEN (duration_sec / 60.0) / distance_km ELSE 0 END AS pace_min_km
      FROM runs 
      WHERE user_id = $1 AND distance_km > 0
      ORDER BY distance_km DESC, created_at DESC
      LIMIT 1`,
      [userId]
    );

    const bestRun = bestRunRows.length > 0 ? bestRunRows[0] : null;

    // Get fastest pace run (optional)
    const { rows: fastestRunRows } = await pool.query(
      `SELECT 
        id,
        distance_km,
        duration_sec,
        created_at,
        (duration_sec / 60.0) / distance_km AS pace_min_km
      FROM runs 
      WHERE user_id = $1 AND distance_km > 0 AND duration_sec > 0
      ORDER BY pace_min_km ASC, created_at DESC
      LIMIT 1`,
      [userId]
    );

    const fastestRun = fastestRunRows.length > 0 ? fastestRunRows[0] : null;

    // Count active days (days with at least one run)
    const { rows: activeDaysRows } = await pool.query(
      `SELECT COUNT(DISTINCT DATE(created_at))::int AS active_days
      FROM runs 
      WHERE user_id = $1`,
      [userId]
    );

    const activeDays = activeDaysRows[0].active_days || 0;

    return res.json({
      ok: true,
      totals: {
        totalRuns: totals.total_runs,
        totalDistanceKm: parseFloat(totals.total_distance_km),
        totalTimeSec: parseInt(totals.total_time_sec),
        avgPaceMinKm: parseFloat(totals.avg_pace_min_km),
        activeDays,
      },
      bestRun: bestRun ? {
        id: bestRun.id,
        distanceKm: parseFloat(bestRun.distance_km),
        durationSec: bestRun.duration_sec,
        paceMinKm: parseFloat(bestRun.pace_min_km),
        createdAt: bestRun.created_at,
      } : null,
      fastestRun: fastestRun ? {
        id: fastestRun.id,
        distanceKm: parseFloat(fastestRun.distance_km),
        durationSec: fastestRun.duration_sec,
        paceMinKm: parseFloat(fastestRun.pace_min_km),
        createdAt: fastestRun.created_at,
      } : null,
    });
  } catch (error) {
    console.error('Stats summary error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /stats/history
 * Returns paginated run history with territory counts
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM runs WHERE user_id = $1',
      [userId]
    );
    const totalRuns = countRows[0].total;

    // Get run history with territory counts
    const { rows } = await pool.query(
      `SELECT 
        r.id,
        r.distance_km,
        r.duration_sec,
        r.created_at,
        r.geojson,
        CASE WHEN r.duration_sec > 0 AND r.distance_km > 0 
          THEN (r.duration_sec / 60.0) / r.distance_km 
          ELSE 0 
        END AS pace_min_km,
        (
          SELECT COUNT(DISTINCT th.tile_id)::int
          FROM territory_history th
          WHERE th.to_owner = r.user_id 
            AND th.changed_at BETWEEN r.created_at - INTERVAL '5 minutes' AND r.created_at + INTERVAL '5 minutes'
        ) AS territories_claimed
      FROM runs r
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const runs = rows.map(row => ({
      id: row.id,
      distanceKm: parseFloat(row.distance_km),
      durationSec: row.duration_sec,
      paceMinKm: parseFloat(row.pace_min_km),
      createdAt: row.created_at,
      territoriesClaimed: row.territories_claimed || 0,
    }));

    return res.json({
      ok: true,
      runs,
      pagination: {
        page,
        limit,
        totalRuns,
        totalPages: Math.ceil(totalRuns / limit),
        hasMore: offset + limit < totalRuns,
      },
    });
  } catch (error) {
    console.error('Stats history error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch run history' });
  }
});

/**
 * GET /stats/run/:id
 * Get detailed stats for a specific run
 */
router.get('/run/:id', requireAuth, async (req, res) => {
  try {
    const runId = parseInt(req.params.id);
    const userId = req.userId;

    const { rows } = await pool.query(
      `SELECT 
        r.id,
        r.user_id,
        r.distance_km,
        r.duration_sec,
        r.created_at,
        r.geojson,
        CASE WHEN r.duration_sec > 0 AND r.distance_km > 0 
          THEN (r.duration_sec / 60.0) / r.distance_km 
          ELSE 0 
        END AS pace_min_km,
        (
          SELECT json_agg(json_build_object(
            'tileId', th.tile_id,
            'fromOwner', th.from_owner,
            'toOwner', th.to_owner,
            'changedAt', th.changed_at,
            'geometry', t.geojson
          ))
          FROM territory_history th
          JOIN territories t ON th.tile_id = t.tile_id
          WHERE th.to_owner = r.user_id 
            AND th.changed_at BETWEEN r.created_at - INTERVAL '5 minutes' AND r.created_at + INTERVAL '5 minutes'
        ) AS territories
      FROM runs r
      WHERE r.id = $1 AND r.user_id = $2`,
      [runId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Run not found' });
    }

    const run = rows[0];
    
    return res.json({
      ok: true,
      run: {
        id: run.id,
        distanceKm: parseFloat(run.distance_km),
        durationSec: run.duration_sec,
        paceMinKm: parseFloat(run.pace_min_km),
        createdAt: run.created_at,
        geojson: run.geojson,
        territories: run.territories || [],
      },
    });
  } catch (error) {
    console.error('Run details error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to fetch run details' });
  }
});

export default router;
