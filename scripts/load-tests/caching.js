import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ============================================
// Custom Metrics
// ============================================
const cacheHitRate = new Rate('cache_hit_rate');
const dbQueryTime = new Trend('db_query_time');
const cacheQueryTime = new Trend('cache_query_time');
const errorRate = new Rate('errors');
const requestCounter = new Counter('total_requests');

// ============================================
// Test Configuration
// ============================================
export const options = {
  stages: [
    // Ramp-up phase
    { duration: '1m', target: 100 }, // Warm up: 0 → 100 users
    { duration: '2m', target: 500 }, // Scale up: 100 → 500 users
    { duration: '2m', target: 1000 }, // Scale to peak: 500 → 1000 users

    // Steady state
    { duration: '5m', target: 1000 }, // Hold at 1000 users

    // Spike test
    { duration: '30s', target: 1500 }, // Spike to 1500 users
    { duration: '1m', target: 1500 }, // Hold spike
    { duration: '30s', target: 1000 }, // Back to normal

    // Cool down
    { duration: '2m', target: 500 }, // Scale down: 1000 → 500
    { duration: '1m', target: 0 }, // Ramp down: 500 → 0
  ],

  thresholds: {
    // Performance requirements
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    'http_req_duration{type:cached}': ['p(95)<20'],
    'http_req_duration{type:uncached}': ['p(95)<300'],

    // Reliability requirements
    http_req_failed: ['rate<0.01'],
    cache_hit_rate: ['rate>0.85'],

    // System stability
    errors: ['rate<0.01'],
    http_reqs: ['rate>500'],
  },

  summaryTrendStats: ['min', 'avg', 'med', 'p(95)', 'p(99)', 'max'],
};

// ============================================
// Configuration
// ============================================
const BASE_URL = 'http://localhost:3000';

// Global arrays to store user IDs (populated in setup)
let popularUserIds = [];
let randomUserIds = [];

// ============================================
// Setup & Teardown
// ============================================

export function setup() {
  console.log('🚀 Starting load test with 1000 concurrent users...');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('⏱️  Duration: ~15 minutes');
  console.log('');

  // Load popular user IDs (80% of traffic)
  console.log('📥 Loading popular user IDs...');
  const popularRes = http.get(`${BASE_URL}/users?limit=100`);
  if (popularRes.status === 200) {
    const users = JSON.parse(popularRes.body);
    popularUserIds = users.map((u) => u.id);
    console.log(`✅ Loaded ${popularUserIds.length} popular users`);
  } else {
    console.error('❌ Failed to load popular users');
    popularUserIds = [];
  }

  // Load random user IDs (20% of traffic)
  console.log('📥 Loading random user IDs...');
  const randomRes = http.get(`${BASE_URL}/users?limit=1000`);
  if (randomRes.status === 200) {
    const users = JSON.parse(randomRes.body);
    randomUserIds = users.map((u) => u.id);
    console.log(`✅ Loaded ${randomUserIds.length} random users`);
  } else {
    console.error('❌ Failed to load random users');
    randomUserIds = [];
  }

  // Warm up cache with popular users
  console.log('');
  console.log('🔥 Warming up cache...');
  let warmedCount = 0;
  popularUserIds.forEach((userId) => {
    const res = http.get(`${BASE_URL}/users/${userId}`);
    if (res.status === 200) warmedCount++;
  });
  console.log(
    `✅ Cache warmed up (${warmedCount}/${popularUserIds.length} successful)`,
  );
  console.log('');

  // Return data to be used by VUs
  return {
    popularUserIds: popularUserIds,
    randomUserIds: randomUserIds,
  };
}

export function teardown(data) {
  console.log('');
  console.log('✅ Load test completed!');
  console.log(
    `📊 Used ${data.popularUserIds.length} popular + ${data.randomUserIds.length} random users`,
  );
}

// ============================================
// Test Scenarios
// ============================================

export default function (data) {
  // Get user IDs from setup data
  const popularIds = data.popularUserIds || [];
  const randomIds = data.randomUserIds || [];

  // Fallback if no users loaded
  if (popularIds.length === 0 && randomIds.length === 0) {
    console.error('No user IDs available!');
    return;
  }

  requestCounter.add(1);

  // 80/20 rule: 80% requests go to popular users (cache hits)
  const isPopularUser = Math.random() < 0.8 && popularIds.length > 0;
  const userId = isPopularUser
    ? popularIds[Math.floor(Math.random() * popularIds.length)]
    : randomIds[Math.floor(Math.random() * randomIds.length)];

  // Scenario weights (based on realistic traffic patterns)
  const scenario = Math.random();

  if (scenario < 0.6) {
    // 60% - Get single user (most common)
    testGetUser(userId, isPopularUser);
  } else if (scenario < 0.8) {
    // 20% - Get user list
    testGetUserList();
  } else if (scenario < 0.9) {
    // 10% - Get user by email
    testGetUserByEmail(popularIds);
  } else if (scenario < 0.95) {
    // 5% - Get stats (expensive query)
    testGetStats();
  } else {
    // 5% - Write operations (create/update/delete)
    testWriteOperations(popularIds);
  }

  // Realistic think time between requests
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// ============================================
// Test Functions
// ============================================

function testGetUser(userId, isPopularUser) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/users/${userId}`, {
    tags: { type: isPopularUser ? 'cached' : 'uncached' },
  });
  const duration = Date.now() - start;

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
    'response time acceptable': () => duration < 500,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Track cache hit/miss (heuristic: fast = cache hit)
  if (duration < 30) {
    cacheHitRate.add(1);
    cacheQueryTime.add(duration);
  } else {
    cacheHitRate.add(0);
    dbQueryTime.add(duration);
  }
}

function testGetUserList() {
  const limit = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
  const res = http.get(`${BASE_URL}/users?limit=${limit}`, {
    tags: { type: 'list' },
  });

  const success = check(res, {
    'list status is 200': (r) => r.status === 200,
    'list has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testGetUserByEmail(popularIds) {
  if (popularIds.length === 0) return;

  // Get random user and search by their email
  const userId = popularIds[Math.floor(Math.random() * popularIds.length)];

  // First get the user to know their email
  const userRes = http.get(`${BASE_URL}/users/${userId}`);
  if (userRes.status !== 200) {
    errorRate.add(1);
    return;
  }

  const user = JSON.parse(userRes.body);
  const email = user.email;

  const res = http.get(`${BASE_URL}/users/email/${email}`, {
    tags: { type: 'email_search' },
  });

  const success = check(res, {
    'email search completed': (r) => r.status === 200 || r.status === 404,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testGetStats() {
  const res = http.get(`${BASE_URL}/users/stats/distribution`, {
    tags: { type: 'stats' },
  });

  const success = check(res, {
    'stats status is 200': (r) => r.status === 200,
    'stats has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.totalUsers !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testWriteOperations(popularIds) {
  const operation = Math.random();

  if (operation < 0.6) {
    // 60% - Create user
    testCreateUser();
  } else if (operation < 0.9) {
    // 30% - Update user
    testUpdateUser(popularIds);
  } else {
    // 10% - Delete user
    testDeleteUser();
  }
}

function testCreateUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);

  const payload = JSON.stringify({
    email: `loadtest_${timestamp}_${random}@example.com`,
    username: `loadtest_${random}`,
    fullName: `Load Test User ${timestamp}`,
  });

  const res = http.post(`${BASE_URL}/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'create' },
  });

  const success = check(res, {
    'create status is 201': (r) => r.status === 201,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testUpdateUser(popularIds) {
  if (popularIds.length === 0) return;

  const userId = popularIds[Math.floor(Math.random() * popularIds.length)];
  const payload = JSON.stringify({
    fullName: `Updated Name ${Date.now()}`,
  });

  const res = http.put(`${BASE_URL}/users/${userId}`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'update' },
  });

  const success = check(res, {
    'update completed': (r) => r.status === 200 || r.status === 404,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testDeleteUser() {
  // Don't delete existing users, create then delete
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);

  const payload = JSON.stringify({
    email: `delete_${timestamp}_${random}@example.com`,
    username: `delete_${random}`,
    fullName: `Delete Test User`,
  });

  const createRes = http.post(`${BASE_URL}/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (createRes.status === 201) {
    const newUser = JSON.parse(createRes.body);
    http.del(`${BASE_URL}/users/${newUser.id}`, null, {
      tags: { type: 'delete' },
    });
  }
}

// ============================================
// Custom Summary
// ============================================

export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    stdout: summary,
    'load-test-results.json': JSON.stringify(data, null, 2),
    'load-test-summary.html': generateHTMLReport(data),
  };
}

function generateSummary(data) {
  let output = '\n';
  output += '═'.repeat(80) + '\n';
  output += '🎯 LOAD TEST RESULTS - 1000 Concurrent Users\n';
  output += '═'.repeat(80) + '\n\n';

  // HTTP Metrics
  output += '📊 HTTP Performance:\n';
  output += '─'.repeat(80) + '\n';
  const httpDuration = data.metrics.http_req_duration;
  output += `  Total Requests:        ${data.metrics.http_reqs.values.count}\n`;
  output += `  Requests/sec:          ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
  output += `  Failed Requests:       ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  output += `  \n`;
  output += `  Response Times:\n`;
  output += `    Min:                 ${httpDuration.values.min.toFixed(2)}ms\n`;
  output += `    Avg:                 ${httpDuration.values.avg.toFixed(2)}ms\n`;
  output += `    Median:              ${httpDuration.values.med.toFixed(2)}ms\n`;
  output += `    P95:                 ${httpDuration.values['p(95)'].toFixed(2)}ms\n`;
  output += `    P99:                 ${httpDuration.values['p(99)'].toFixed(2)}ms\n`;
  output += `    Max:                 ${httpDuration.values.max.toFixed(2)}ms\n`;
  output += '\n';

  // Cache Metrics
  output += '💾 Cache Performance:\n';
  output += '─'.repeat(80) + '\n';
  if (data.metrics.cache_hit_rate) {
    const hitRate = data.metrics.cache_hit_rate.values.rate * 100;
    const hitStatus = hitRate >= 85 ? '✅' : '❌';
    output += `  ${hitStatus} Cache Hit Rate:        ${hitRate.toFixed(2)}% (Target: >85%)\n`;
  }

  if (data.metrics.cache_query_time) {
    output += `  Cache Response Time:   ${data.metrics.cache_query_time.values.avg.toFixed(2)}ms (avg)\n`;
  }

  if (data.metrics.db_query_time) {
    output += `  DB Response Time:      ${data.metrics.db_query_time.values.avg.toFixed(2)}ms (avg)\n`;
  }
  output += '\n';

  // Performance Goals
  output += '🎯 Performance Goals:\n';
  output += '─'.repeat(80) + '\n';

  const p95 = httpDuration.values['p(95)'];
  const p95Status = p95 < 100 ? '✅' : '❌';
  output += `  ${p95Status} P95 < 100ms:           ${p95.toFixed(2)}ms\n`;

  const p99 = httpDuration.values['p(99)'];
  const p99Status = p99 < 200 ? '✅' : '❌';
  output += `  ${p99Status} P99 < 200ms:           ${p99.toFixed(2)}ms\n`;

  const errorRateVal = data.metrics.http_req_failed.values.rate * 100;
  const errorStatus = errorRateVal < 1 ? '✅' : '❌';
  output += `  ${errorStatus} Error Rate < 1%:      ${errorRateVal.toFixed(4)}%\n`;

  const rps = data.metrics.http_reqs.values.rate;
  const rpsStatus = rps > 500 ? '✅' : '❌';
  output += `  ${rpsStatus} Throughput > 500/s:   ${rps.toFixed(2)} req/s\n`;
  output += '\n';

  // System Stability
  output += '⚡ System Stability:\n';
  output += '─'.repeat(80) + '\n';
  output += `  Peak Concurrent Users: 1500\n`;
  output += `  Test Duration:         ~15 minutes\n`;
  output += `  Data Transferred:      ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB\n`;
  output += '\n';

  output += '═'.repeat(80) + '\n';

  return output;
}

function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report - 1000 Concurrent Users</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    .metric { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #4CAF50; }
    .metric.warning { border-left-color: #FF9800; }
    .metric.error { border-left-color: #f44336; }
    .success { color: #4CAF50; font-weight: bold; }
    .warning { color: #FF9800; font-weight: bold; }
    .error { color: #f44336; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Load Test Report</h1>
    <p><strong>Test Configuration:</strong> 1000 Concurrent Users</p>
    <p><strong>Duration:</strong> ~15 minutes</p>
    <p><strong>Date:</strong> ${new Date().toISOString()}</p>
    
    <h2>📊 HTTP Performance</h2>
    <div class="metric">
      <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
    </div>
    <div class="metric">
      <strong>Requests/sec:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)}
    </div>
    <div class="metric ${data.metrics.http_req_failed.values.rate < 0.01 ? '' : 'error'}">
      <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
    </div>
    
    <h2>⚡ Response Times</h2>
    <div class="metric">
      <strong>P95:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
      ${data.metrics.http_req_duration.values['p(95)'] < 100 ? '<span class="success">✓ PASS</span>' : '<span class="error">✗ FAIL</span>'}
    </div>
    <div class="metric">
      <strong>P99:</strong> ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
      ${data.metrics.http_req_duration.values['p(99)'] < 200 ? '<span class="success">✓ PASS</span>' : '<span class="error">✗ FAIL</span>'}
    </div>
    
    <h2>💾 Cache Performance</h2>
    <div class="metric">
      <strong>Cache Hit Rate:</strong> ${(data.metrics.cache_hit_rate.values.rate * 100).toFixed(2)}%
      ${data.metrics.cache_hit_rate.values.rate > 0.85 ? '<span class="success">✓ PASS</span>' : '<span class="warning">⚠ BELOW TARGET</span>'}
    </div>
  </div>
</body>
</html>
  `;
}
