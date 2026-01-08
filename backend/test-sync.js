// Integration test: Create user → Run → Sync → Verify
import fetch from 'node-fetch';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/territory_runner'
});

const API_URL = process.env.TEST_API_URL || 'https://territory-runner-api.onrender.com';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

// Test GPS points (simulated 500m run in Bangalore)
const TEST_RUN_POINTS = [
  { lat: 13.1896, lng: 77.7547, timestamp: Date.now() - 120000, accuracy: 8 },
  { lat: 13.1900, lng: 77.7550, timestamp: Date.now() - 100000, accuracy: 7 },
  { lat: 13.1905, lng: 77.7553, timestamp: Date.now() - 80000, accuracy: 9 },
  { lat: 13.1910, lng: 77.7556, timestamp: Date.now() - 60000, accuracy: 6 },
  { lat: 13.1915, lng: 77.7559, timestamp: Date.now() - 40000, accuracy: 8 },
  { lat: 13.1920, lng: 77.7562, timestamp: Date.now() - 20000, accuracy: 7 },
  { lat: 13.1925, lng: 77.7565, timestamp: Date.now(), accuracy: 9 }
];

async function runTest() {
  console.log('🧪 Starting Integration Test...\n');
  let token = null;
  let userId = null;

  try {
    // Step 1: Create test user
    console.log('1️⃣  Creating test user:', TEST_EMAIL);
    const signupRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        username: `TestRunner${Date.now()}`
      })
    });

    const signupText = await signupRes.text();
    if (!signupRes.ok) {
      console.error('Signup response:', signupText);
      throw new Error(`Signup failed (${signupRes.status}): ${signupText.substring(0, 200)}`);
    }

    let signupData;
    try {
      signupData = JSON.parse(signupText);
    } catch (e) {
      console.error('Invalid JSON from signup:', signupText.substring(0, 500));
      throw new Error('Signup returned non-JSON response');
    }

    token = signupData.token;
    userId = signupData.user.id;
    console.log('✅ User created:', userId, '\n');

    // Step 2: Submit a run via /runs endpoint
    console.log('2️⃣  Submitting test run (7 GPS points, ~0.5km)...');
    const runRes = await fetch(`${API_URL}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        points: TEST_RUN_POINTS,
        distanceKm: 0.52,
        durationSec: 180,
        activityType: 'run'
      })
    });

    const runText = await runRes.text();
    if (!runRes.ok) {
      console.error('Run response:', runText);
      let error;
      try {
        error = JSON.parse(runText);
      } catch (e) {
        throw new Error(`Run submission failed (${runRes.status}): ${runText.substring(0, 200)}`);
      }
      throw new Error(`Run submission failed: ${error.error || error.details || runRes.statusText}`);
    }

    const runData = JSON.parse(runText);
    console.log('✅ Run submitted:', runData.runId);
    console.log('   Tiles updated:', runData.updatedTiles?.length || 0, '\n');

    // Step 3: Test sync endpoint with batch data
    console.log('3️⃣  Testing /runs/sync with batch upload...');
    const syncRes = await fetch(`${API_URL}/runs/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        runs: [{
          points: TEST_RUN_POINTS.slice(0, 4), // Shorter run
          distanceKm: 0.25,
          durationSec: 90,
          activityType: 'run',
          updatedTiles: []
        }]
      })
    });

    if (!syncRes.ok) {
      const error = await syncRes.json();
      throw new Error(`Sync failed: ${error.error || error.details || syncRes.statusText}`);
    }

    const syncData = await syncRes.json();
    console.log('✅ Sync successful:', syncData.syncedRuns?.length || 0, 'runs synced\n');

    // Step 4: Verify in database
    console.log('4️⃣  Verifying data in database...');
    const { rows: runs } = await pool.query(
      'SELECT id, distance_km, duration_sec, activity_type FROM runs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    console.log('✅ Runs in DB:', runs.length);
    runs.forEach((run, i) => {
      console.log(`   Run ${i + 1}: ${run.distance_km}km, ${run.duration_sec}s, ${run.activity_type}`);
    });

    const { rows: territories } = await pool.query(
      'SELECT COUNT(*)::int as count FROM territories WHERE owner_id = $1',
      [userId]
    );
    console.log('✅ Territories owned:', territories[0].count, '\n');

    // Step 5: Fetch stats via API
    console.log('5️⃣  Fetching user stats via /stats/summary...');
    const statsRes = await fetch(`${API_URL}/stats/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!statsRes.ok) {
      throw new Error(`Stats fetch failed: ${statsRes.statusText}`);
    }

    const statsData = await statsRes.json();
    console.log('✅ Stats retrieved:');
    console.log('   Total runs:', statsData.totals?.totalRuns || 0);
    console.log('   Total distance:', (statsData.totals?.totalDistanceKm || 0).toFixed(2), 'km');
    console.log('   Active days:', statsData.totals?.activeDays || 0, '\n');

    // Step 6: Test territory context endpoint
    console.log('6️⃣  Testing /territories/context...');
    const contextRes = await fetch(`${API_URL}/territories/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lat: TEST_RUN_POINTS[0].lat,
        lng: TEST_RUN_POINTS[0].lng
      })
    });

    if (!contextRes.ok) {
      const error = await contextRes.json();
      throw new Error(`Context fetch failed: ${error.error || contextRes.statusText}`);
    }

    const contextData = await contextRes.json();
    console.log('✅ Territory context retrieved:');
    console.log('   Nearby territories:', contextData.territories?.length || 0);
    console.log('   Times run here:', contextData.timesRunHere || 0, '\n');

    // Cleanup: Delete test user
    console.log('7️⃣  Cleaning up test data...');
    await pool.query('DELETE FROM runs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM territories WHERE owner_id = $1', [userId]);
    await pool.query('DELETE FROM territory_history WHERE to_owner = $1 OR from_owner = $1', [userId]);
    await pool.query('DELETE FROM territory_claims WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_stats WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('✅ Test user deleted\n');

    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    console.log('Summary:');
    console.log('  ✓ User creation');
    console.log('  ✓ Run submission (/runs)');
    console.log('  ✓ Batch sync (/runs/sync)');
    console.log('  ✓ Database persistence');
    console.log('  ✓ Stats endpoint');
    console.log('  ✓ Territory context');
    console.log('  ✓ Cleanup');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);

    // Attempt cleanup on failure
    if (userId) {
      try {
        console.log('\nCleaning up after failure...');
        await pool.query('DELETE FROM runs WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM territories WHERE owner_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        console.log('✓ Cleanup done');
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr.message);
      }
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();
