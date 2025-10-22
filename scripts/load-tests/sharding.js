import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Warm up to 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 500 }, // Spike to 500 users
    { duration: '2m', target: 500 }, // Stay at 500 users
    { duration: '1m', target: 1000 }, // Spike to 1000 users
    { duration: '1m', target: 1000 }, // Stay at 1000 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: [
      'p(50)<20', // 50% of requests under 20ms
      'p(95)<50', // 95% of requests under 50ms
      'p(99)<100', // 99% of requests under 100ms
    ],
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

// Get some user IDs (in real test, you'd get these from API)
const BASE_URL = 'http://localhost:3000';

export function setup() {
  // Fetch sample user IDs
  const response = http.get(`${BASE_URL}/users?limit=100`);
  const users = JSON.parse(response.body);
  const userIds = users.map((u) => u.id);

  console.log(`Setup: Loaded ${userIds.length} user IDs for testing`);

  return { userIds };
}

export default function (data) {
  const { userIds } = data;

  // Test 1: Read user (most common operation)
  const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
  const readRes = http.get(`${BASE_URL}/users/${randomUserId}`);

  const readOk = check(readRes, {
    'read status 200': (r) => r.status === 200,
    'read time < 50ms': (r) => r.timings.duration < 50,
    'read time < 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(!readOk);

  // 10% chance to create new user
  if (Math.random() < 0.1) {
    const createRes = http.post(
      `${BASE_URL}/users`,
      JSON.stringify({
        email: `loadtest${Date.now()}${Math.random()}@example.com`,
        username: `loadtest${Date.now()}`,
        fullName: 'Load Test User',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const createOk = check(createRes, {
      'create status 201': (r) => r.status === 201,
      'create time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(!createOk);
  }

  // 5% chance to list users
  if (Math.random() < 0.05) {
    const listRes = http.get(`${BASE_URL}/users?limit=20`);

    check(listRes, {
      'list status 200': (r) => r.status === 200,
    });
  }

  sleep(0.1); // Small pause between iterations
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  const metrics = data.metrics;

  let summary = '\n';
  summary += '📊 Load Test Results\n';
  summary += '═══════════════════════════════════════\n\n';

  // Request stats
  summary += `${indent}Requests:\n`;
  summary += `${indent}  Total:           ${metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Rate:            ${metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}  Failed:          ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += '\n';

  // Duration stats
  summary += `${indent}Response Time (ms):\n`;
  summary += `${indent}  Min:             ${metrics.http_req_duration.values.min.toFixed(2)}\n`;
  summary += `${indent}  Average:         ${metrics.http_req_duration.values.avg.toFixed(2)}\n`;
  summary += `${indent}  Median (p50):    ${metrics.http_req_duration.values['p(50)'].toFixed(2)}\n`;
  summary += `${indent}  p95:             ${metrics.http_req_duration.values['p(95)'].toFixed(2)} ${metrics.http_req_duration.values['p(95)'] < 50 ? '✅' : '❌'}\n`;
  summary += `${indent}  p99:             ${metrics.http_req_duration.values['p(99)'].toFixed(2)} ${metrics.http_req_duration.values['p(99)'] < 100 ? '✅' : '❌'}\n`;
  summary += `${indent}  Max:             ${metrics.http_req_duration.values.max.toFixed(2)}\n`;
  summary += '\n';

  // Virtual users
  summary += `${indent}Virtual Users:\n`;
  summary += `${indent}  Max:             ${metrics.vus_max.values.max}\n`;
  summary += '\n';

  summary += '═══════════════════════════════════════\n';

  return summary;
}
