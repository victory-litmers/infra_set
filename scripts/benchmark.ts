import axios from 'axios';

const API_URL = 'http://localhost:3000/users';
const NUM_QUERIES = 1000;

// Get random user IDs
async function getRandomUserIds(
  count: number = 100,
): Promise<Array<{ id: string }>> {
  const response = await axios.get(`${API_URL}?limit=${count}`);
  return response.data as Array<{ id: string }>;
}

async function benchmarkQueries(userIds: string[]) {
  console.log('🔥 Starting benchmark...');
  console.log(`📊 Number of queries: ${NUM_QUERIES}`);
  console.log('');

  const times: number[] = [];
  const startTime = Date.now();

  for (let i = 0; i < NUM_QUERIES; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    const queryStart = Date.now();
    try {
      await axios.get(`${API_URL}/${userId}`);
      const queryTime = Date.now() - queryStart;
      times.push(queryTime);
    } catch (error) {
      console.error(`Query failed for user ${userId}:`, error.message);
    }

    // Progress
    if ((i + 1) % 100 === 0) {
      const progress = (((i + 1) / NUM_QUERIES) * 100).toFixed(0);
      process.stdout.write(`\r📈 Progress: ${progress}%`);
    }
  }

  console.log('');
  console.log('');

  const totalTime = Date.now() - startTime;

  // Calculate statistics
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = times[0];
  const max = times[times.length - 1];
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const qps = (NUM_QUERIES / (totalTime / 1000)).toFixed(2);

  console.log('📊 Benchmark Results:');
  console.log('═══════════════════════════════════════');
  console.log(`Total queries:     ${NUM_QUERIES}`);
  console.log(`Total time:        ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Queries per sec:   ${qps}`);
  console.log('');
  console.log('Query Time (ms):');
  console.log(`  Min:             ${min}ms`);
  console.log(`  Average:         ${avg.toFixed(2)}ms`);
  console.log(`  Median (p50):    ${p50}ms`);
  console.log(`  p95:             ${p95}ms ${p95 < 50 ? '✅' : '❌'}`);
  console.log(`  p99:             ${p99}ms ${p99 < 100 ? '✅' : '❌'}`);
  console.log(`  Max:             ${max}ms`);
  console.log('═══════════════════════════════════════');

  // Check if goals met
  console.log('');
  console.log('🎯 Goals:');
  console.log(`  p95 < 50ms:      ${p95 < 50 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  p99 < 100ms:     ${p99 < 100 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(
    `  QPS > 100:       ${parseFloat(qps) > 100 ? '✅ PASS' : '❌ FAIL'}`,
  );
}

async function main() {
  console.log('🔍 Fetching random user IDs...');
  const userIds = await getRandomUserIds(100);
  console.log(`✅ Got ${userIds.length} user IDs`);
  console.log('');

  await benchmarkQueries(userIds.map((user) => user.id));
}

main()
  .then(() => {
    console.log('');
    console.log('🎉 Benchmark completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
