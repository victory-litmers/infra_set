import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const orderDuration = new Trend('order_duration');
const ordersCreated = new Counter('orders_created');

export const options = {
  stages: [
    { duration: '1m', target: 500 }, // Ramp up to 500 VUs
    { duration: '3m', target: 500 }, // Hold at 500 VUs
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3000/orders';

  const payload = JSON.stringify({
    userId: `user-${__VU}-${__ITER}`,
    items: [
      {
        productId: `prod-${Math.floor(Math.random() * 100)}`,
        productName: `Product ${Math.floor(Math.random() * 100)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.random() * 1000,
      },
    ],
    total: Math.random() * 1000,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const start = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - start;

  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has orderId': (r) => {
      try {
        return JSON.parse(r.body).orderId !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  orderDuration.add(duration);
  if (success) ordersCreated.add(1);

  // Minimal sleep to maximize throughput
  sleep(0.05);
}

export function handleSummary(data) {
  const totalOrders = data.metrics.orders_created.values.count;
  const durationMin = data.state.testRunDurationMs / 60000;
  const ordersPerMin = totalOrders / durationMin;
  const p95Duration = data.metrics.order_duration.values['p(95)'];
  const errorRate = data.metrics.errors.values.rate;

  console.log('\n========================================');
  console.log('🚀 10K ORDERS/MIN LOAD TEST');
  console.log('========================================\n');
  console.log(`📊 Results:`);
  console.log(`   Total Orders: ${totalOrders}`);
  console.log(`   Test Duration: ${durationMin.toFixed(1)} min`);
  console.log(`   Orders/min: ${ordersPerMin.toFixed(0)}`);
  console.log(
    `   Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}`,
  );
  console.log(`\n⚡ Performance:`);
  console.log(`   p(95): ${p95Duration.toFixed(2)}ms`);
  console.log(
    `   p(99): ${data.metrics.order_duration.values['p(99)'].toFixed(2)}ms`,
  );
  console.log(`   Error Rate: ${(errorRate * 100).toFixed(2)}%`);

  console.log(`\n🎯 Target: 10,000 orders/min, p(95) < 200ms`);

  const throughputOk = ordersPerMin >= 10000;
  const latencyOk = p95Duration < 200;
  const errorsOk = errorRate < 0.01;

  if (throughputOk && latencyOk && errorsOk) {
    console.log(`\n✅ ALL GOALS ACHIEVED! 🎉`);
    console.log(
      `   ✅ Throughput: ${ordersPerMin.toFixed(0)}/min (target: 10,000)`,
    );
    console.log(`   ✅ Latency: ${p95Duration.toFixed(0)}ms (target: <200ms)`);
    console.log(`   ✅ Errors: ${(errorRate * 100).toFixed(2)}% (target: <1%)`);
  } else {
    console.log(`\n⚠️  GOALS NOT ACHIEVED:`);
    if (!throughputOk) {
      console.log(
        `   ❌ Throughput: ${ordersPerMin.toFixed(0)}/min (need: ${(10000 - ordersPerMin).toFixed(0)} more)`,
      );
    } else {
      console.log(`   ✅ Throughput: ${ordersPerMin.toFixed(0)}/min`);
    }
    if (!latencyOk) {
      console.log(
        `   ❌ Latency: ${p95Duration.toFixed(0)}ms (need: ${(p95Duration - 200).toFixed(0)}ms reduction)`,
      );
    } else {
      console.log(`   ✅ Latency: ${p95Duration.toFixed(0)}ms`);
    }
    if (!errorsOk) {
      console.log(`   ❌ Errors: ${(errorRate * 100).toFixed(2)}%`);
    } else {
      console.log(`   ✅ Errors: ${(errorRate * 100).toFixed(2)}%`);
    }
  }

  console.log('\n========================================\n');

  return {
    'summary-10k.json': JSON.stringify(data, null, 2),
  };
}
