import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 2000);
    const ownerId = req.query.ownerId ? parseInt(req.query.ownerId, 10) : null;
    const rows = ownerId
      ? (await pool.query('SELECT * FROM territories WHERE owner_id = $1 ORDER BY last_claimed DESC LIMIT $2', [ownerId, limit])).rows
      : (await pool.query('SELECT * FROM territories ORDER BY last_claimed DESC LIMIT $1', [limit])).rows;
    return res.json({ ok: true, territories: rows });
  } catch (err) {
    console.error('Territory fetch failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch territories' });
  }
});

router.get('/history/:tileId', requireAuth, async (req, res) => {
  try {
    const { tileId } = req.params;
    const rows = (await pool.query('SELECT * FROM territory_history WHERE tile_id = $1 ORDER BY changed_at DESC LIMIT 50', [tileId])).rows;
    return res.json({ ok: true, history: rows });
  } catch (err) {
    console.error('History fetch failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch history' });
  }
});

// Get territory context for current location (with user's personal best)
router.post('/context', requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.userId;

    if (!lat || !lng) {
      return res.status(400).json({ ok: false, error: 'Latitude and longitude required' });
    }

    // Find territories within 100m radius of current position
    const territoriesQuery = `
      SELECT 
        t.tile_id,
        t.owner_id,
        t.last_claimed,
        t.claim_count,
        t.geometry,
        u.username as owner_name
      FROM territories t
      LEFT JOIN users u ON t.owner_id = u.id
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_GeomFromGeoJSON(t.geometry), 4326)::geography,
        100
      )
      ORDER BY t.last_claimed DESC
      LIMIT 5
    `;

    const territories = await pool.query(territoriesQuery, [lng, lat]);

    // Get user's previous runs in this area (within 50m)
    const userRunsQuery = `
      SELECT 
        r.id,
        r.distance_km,
        r.duration_sec,
        r.created_at,
        r.points
      FROM runs r
      WHERE r.user_id = $1
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.points) AS p
          WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint((p->>'lng')::float, (p->>'lat')::float), 4326)::geography,
            ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
            50
          )
        )
      ORDER BY r.created_at DESC
      LIMIT 10
    `;

    const userRuns = await pool.query(userRunsQuery, [userId, lng, lat]);

    // Get fastest time for this user in this area
    let personalBest = null;
    if (userRuns.rows.length > 0) {
      const fastestRun = userRuns.rows.reduce((fastest, current) => {
        const pace = current.duration_sec / current.distance_km;
        const fastestPace = fastest.duration_sec / fastest.distance_km;
        return pace < fastestPace ? current : fastest;
      });

      personalBest = {
        runId: fastestRun.id,
        distanceKm: fastestRun.distance_km,
        durationSec: fastestRun.duration_sec,
        paceMinPerKm: (fastestRun.duration_sec / 60) / fastestRun.distance_km,
        date: fastestRun.created_at
      };
    }

    // Get territory ownership history
    const historyQuery = `
      SELECT 
        th.tile_id,
        th.old_owner_id,
        th.new_owner_id,
        th.changed_at,
        u1.username as old_owner_name,
        u2.username as new_owner_name
      FROM territory_history th
      LEFT JOIN users u1 ON th.old_owner_id = u1.id
      LEFT JOIN users u2 ON th.new_owner_id = u2.id
      WHERE th.tile_id = ANY($1)
      ORDER BY th.changed_at DESC
      LIMIT 20
    `;

    const tileIds = territories.rows.map(t => t.tile_id);
    const history = tileIds.length > 0 
      ? await pool.query(historyQuery, [tileIds])
      : { rows: [] };

    return res.json({
      ok: true,
      territories: territories.rows,
      personalBest,
      timesRunHere: userRuns.rows.length,
      history: history.rows
    });

  } catch (err) {
    console.error('Territory context fetch failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch territory context' });
  }
});

export default router;
