import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: userRows } = await pool.query('SELECT id, email, username, created_at FROM users WHERE id = $1', [req.userId]);
    if (userRows.length === 0) return res.status(404).json({ ok: false, error: 'User not found' });
    const user = userRows[0];
    
    // Recalculate stats from current data
    const { rows: territoryStats } = await pool.query(`
      SELECT 
        COUNT(*)::int as territories_owned,
        COALESCE(SUM(distance_km), 0) as total_distance_km
      FROM territories 
      WHERE owner_id = $1
    `, [req.userId]);
    
    const { rows: runStats } = await pool.query(`
      SELECT 
        COUNT(*)::int as total_runs,
        COALESCE(SUM(distance_km), 0) as run_distance_km
      FROM runs 
      WHERE user_id = $1
    `, [req.userId]);
    
    // Update user_stats table
    await pool.query(`
      INSERT INTO user_stats (user_id, total_distance_km, territories_owned, area_km2, updated_at)
      VALUES ($1, $2, $3, 0, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        total_distance_km = EXCLUDED.total_distance_km,
        territories_owned = EXCLUDED.territories_owned,
        updated_at = NOW()
    `, [req.userId, territoryStats[0].total_distance_km, territoryStats[0].territories_owned]);
    
    const stats = {
      territories_owned: territoryStats[0].territories_owned,
      total_distance_km: parseFloat(territoryStats[0].total_distance_km),
      total_runs: runStats[0].total_runs,
      area_km2: 0,
      currentStreak: 0, // TODO: calculate streak
      rank: null // TODO: calculate rank
    };
    
    return res.json({ ok: true, user: { ...user, stats } });
  } catch (err) {
    console.error('Me fetch failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to load profile' });
  }
});

export default router;
