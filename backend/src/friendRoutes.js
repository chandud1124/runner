import express from 'express';
import { pool } from './db.js';
import { requireAuth } from './middleware/auth.js';

const router = express.Router();

// Send friend request
router.post('/request', requireAuth, async (req, res) => {
  try {
    const { friendEmail } = req.body;
    if (!friendEmail) return res.status(400).json({ ok: false, error: 'Friend email required' });

    const friendResult = await pool.query('SELECT id FROM users WHERE email = $1', [friendEmail]);
    if (friendResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    const friendId = friendResult.rows[0].id;
    if (friendId === req.userId) {
      return res.status(400).json({ ok: false, error: 'Cannot add yourself as friend' });
    }

    // Check if already exists
    const existing = await pool.query(
      'SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.userId, friendId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, error: 'Friendship already exists or pending' });
    }

    await pool.query(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
      [req.userId, friendId, 'pending']
    );

    // Create notification for friend
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        friendId,
        'friend_request',
        'New Friend Request',
        'Someone wants to connect with you',
        JSON.stringify({ from_user_id: req.userId })
      ]
    );

    res.json({ ok: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ ok: false, error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/accept/:friendId', requireAuth, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId, 10);

    const result = await pool.query(
      'UPDATE friendships SET status = $1 WHERE user_id = $2 AND friend_id = $3 AND status = $4 RETURNING *',
      ['accepted', friendId, req.userId, 'pending']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Friend request not found' });
    }

    // Create reciprocal friendship
    await pool.query(
      'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.userId, friendId, 'accepted']
    );

    // Notify the requester
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        friendId,
        'friend_accepted',
        'Friend Request Accepted',
        'Your friend request was accepted',
        JSON.stringify({ from_user_id: req.userId })
      ]
    );

    res.json({ ok: true, message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ ok: false, error: 'Failed to accept friend request' });
  }
});

// Get friends list
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.username, u.avatar_url, f.status
       FROM friendships f
       JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.id != $1
       ORDER BY f.created_at DESC`,
      [req.userId]
    );

    res.json({ ok: true, friends: rows });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get friends' });
  }
});

// Remove friend
router.delete('/:friendId', requireAuth, async (req, res) => {
  try {
    const friendId = parseInt(req.params.friendId, 10);

    await pool.query(
      'DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.userId, friendId]
    );

    res.json({ ok: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ ok: false, error: 'Failed to remove friend' });
  }
});

// Get friends activity feed
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Get friend IDs
    const { rows: friendRows } = await pool.query(
      `SELECT DISTINCT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END as friend_id
       FROM friendships
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [req.userId]
    );

    if (friendRows.length === 0) {
      return res.json({ ok: true, activities: [] });
    }

    const friendIds = friendRows.map(row => row.friend_id);

    // Get recent runs from friends
    const { rows: runRows } = await pool.query(
      `SELECT r.id, r.user_id, r.distance_km, r.duration_sec, r.created_at,
              u.username,
              COUNT(th.tile_id)::int as territories_conquered
       FROM runs r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN territory_history th ON th.to_owner = r.user_id
         AND th.changed_at BETWEEN r.created_at - INTERVAL '5 minutes'
         AND r.created_at + INTERVAL '5 minutes'
       WHERE r.user_id = ANY($1)
         AND r.created_at > NOW() - INTERVAL '7 days'
       GROUP BY r.id, r.user_id, r.distance_km, r.duration_sec, r.created_at, u.username
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [friendIds, limit]
    );

    // Get territory conquests by others
    const { rows: conquestRows } = await pool.query(
      `SELECT th.tile_id, th.from_owner, th.to_owner, th.changed_at,
              u_from.username as from_username,
              u_to.username as to_username
       FROM territory_history th
       JOIN users u_from ON th.from_owner = u_from.id
       JOIN users u_to ON th.to_owner = u_to.id
       WHERE th.from_owner = $1 AND th.to_owner = ANY($2)
         AND th.changed_at > NOW() - INTERVAL '7 days'
       ORDER BY th.changed_at DESC
       LIMIT $3`,
      [req.userId, friendIds, Math.floor(limit / 2)]
    );

    // Combine and format activities
    const activities = [];

    // Add run activities
    runRows.forEach(run => {
      activities.push({
        id: `run_${run.id}`,
        type: 'run',
        userId: run.user_id,
        username: run.username,
        timestamp: run.created_at,
        data: {
          distanceKm: parseFloat(run.distance_km),
          durationSec: run.duration_sec,
          territoriesConquered: run.territories_conquered
        }
      });
    });

    // Add conquest activities (you lost territory)
    conquestRows.forEach(conquest => {
      activities.push({
        id: `conquest_${conquest.tile_id}_${conquest.changed_at}`,
        type: 'territory_lost',
        userId: conquest.to_owner,
        username: conquest.to_username,
        timestamp: conquest.changed_at,
        data: {
          tileId: conquest.tile_id
        }
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ ok: true, activities: activities.slice(0, limit) });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get activity feed' });
  }
});

// Get friends stats for comparison
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // Get friend IDs
    const { rows: friendRows } = await pool.query(
      `SELECT DISTINCT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END as friend_id
       FROM friendships
       WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'`,
      [req.userId]
    );

    if (friendRows.length === 0) {
      return res.json({ ok: true, friends: [] });
    }

    const friendIds = friendRows.map(row => row.friend_id);

    // Get friends stats
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.avatar_url,
              COALESCE(us.total_distance_km, 0) as total_distance_km,
              COALESCE(us.territories_owned, 0) as territories_owned,
              COALESCE(us.area_km2, 0) as area_km2,
              COUNT(r.id)::int as total_runs,
              MAX(r.created_at) as last_run_at
       FROM users u
       LEFT JOIN user_stats us ON u.id = us.user_id
       LEFT JOIN runs r ON u.id = r.user_id
       WHERE u.id = ANY($1)
       GROUP BY u.id, u.username, u.avatar_url, us.total_distance_km, us.territories_owned, us.area_km2`,
      [friendIds]
    );

    const friends = rows.map(row => ({
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
      totalDistanceKm: parseFloat(row.total_distance_km || 0),
      territoriesOwned: parseInt(row.territories_owned || 0),
      areaKm2: parseFloat(row.area_km2 || 0),
      totalRuns: row.total_runs,
      lastRunAt: row.last_run_at
    }));

    res.json({ ok: true, friends });
  } catch (error) {
    console.error('Get friends stats error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get friends stats' });
  }
});

// Get weekly comparison
router.get('/weekly-comparison', requireAuth, async (req, res) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    // Get user's weekly distance
    const { rows: userRows } = await pool.query(
      `SELECT COALESCE(SUM(distance_km), 0) as weekly_distance
       FROM runs
       WHERE user_id = $1 AND created_at >= $2`,
      [req.userId, weekStart]
    );

    const userWeeklyDistance = parseFloat(userRows[0].weekly_distance);

    // Get friends' average weekly distance
    const { rows: friendRows } = await pool.query(
      `SELECT DISTINCT CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END as friend_id
       FROM friendships f
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'`,
      [req.userId]
    );

    let friendsAvgDistance = 0;
    if (friendRows.length > 0) {
      const friendIds = friendRows.map(row => row.friend_id);

      const { rows: avgRows } = await pool.query(
        `SELECT AVG(weekly_distance) as avg_distance
         FROM (
           SELECT SUM(r.distance_km) as weekly_distance
           FROM runs r
           WHERE r.user_id = ANY($1) AND r.created_at >= $2
           GROUP BY r.user_id
         ) weekly_totals`,
        [friendIds, weekStart]
      );

      friendsAvgDistance = parseFloat(avgRows[0].avg_distance || 0);
    }

    res.json({
      ok: true,
      comparison: {
        userWeeklyDistance,
        friendsAvgDistance,
        weekStart: weekStart.toISOString()
      }
    });
  } catch (error) {
    console.error('Get weekly comparison error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get weekly comparison' });
  }
});

export default router;
