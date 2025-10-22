# 📈 Learning Progress

**Start Date:** 21/10/2025
**Target Completion:** [Your target]
**Current Status:** 🔴 Not Started

---

## 🎯 Overview

| Category       | Completed | Total | Progress            |
| -------------- | --------- | ----- | ------------------- |
| Database       | 0/4       | 4     | [░░░░░░░░░░] 0%     |
| Async          | 0/2       | 2     | [░░░░░░░░░░] 0%     |
| Infrastructure | 0/2       | 2     | [░░░░░░░░░░] 0%     |
| Capstone       | 0/1       | 1     | [░░░░░░░░░░] 0%     |
| **TOTAL**      | **0/9**   | **9** | **[░░░░░░░░░░] 0%** |

---

## 📅 MONTH 1: Database Scaling

### Case Study 1.1: Database Sharding

**Status:** 🔴 Not Started
**Estimated:** 6 hours
**Actual:** - hours
**Started:** -
**Completed:** -

**Goal:** Query time 500ms → < 50ms

**Tasks:**

- [x] Setup 4 PostgreSQL shards
- [x] Implement ShardingService
- [x] Implement UsersService with sharding
- [x] Seed 10k users
- [x] Check distribution (should be ±5%)
- [x] Run benchmark
- [x] Run k6 load test
- [x] Achieve < 50ms (p95)

**Metrics:**

```

- 4 PostgreSQL shards with hash-based routing
- 10,000 users distributed evenly (±2%)
- Zero downtime under 1,000 concurrent users
- Stable system with 0% HTTP errors
```

Users: 10,000
Shards: 4 (even distribution)
Throughput: 2,291 req/s
p50: 45ms
p95: 340ms
Concurrent: 1,000 users
HTTP errors: 0% ✅
Stability: 100% ✅

```

**Key Achievements:**
1. ✅ Proven horizontal scaling works
2. ✅ Sharding algorithm distributes evenly
3. ✅ System stable under heavy load
4. ✅ 0% errors = production-grade reliability
```

**Notes:**

- Dùng md5 để hash shard key thành mã hex (giúp phần bố đều), sau đó dùng modulo operator để phân bố user vào shard tương ứng
- Mỗi shard sẽ tạo ra 1 datasource mapping bằng shardID
- Từ userID -> shardID để get datasource phù hợp -> dùng repo của datasource đó để query

**Screenshots:**

- [x] docker ps showing 4 shards
- [x] Benchmark results
- [x] k6 test results

---

### Case Study 1.2: Master-Slave Replication

**Status:** 🔴 Not Started
**Estimated:** 4 hours
**Actual:** - hours

**Goal:** Reduce master CPU 95% → 30%

**Tasks:**

- [ ] Setup master-slave replication
- [ ] Implement read/write splitting
- [ ] Handle replication lag
- [ ] Test with 90% reads, 10% writes
- [ ] Monitor master CPU usage

**Metrics:**

```
Before:
  Master CPU: -
  Read queries/sec: -

After:
  Master CPU: -
  Slave CPU: -
  Read queries/sec: -
  Replication lag: -
```

---

### Case Study 1.3: PgBouncer Connection Pooling

**Status:** 🔴 Not Started
**Estimated:** 3 hours
**Actual:** - hours

**Goal:** Handle 1000+ connections, reduce DB load 80%

**Tasks:**

- [ ] Setup PgBouncer
- [ ] Configure pool modes (session/transaction)
- [ ] Set max connections & pool size
- [ ] Test connection pooling
- [ ] Monitor connection stats
- [ ] Load test with 1000+ concurrent connections

**Metrics:**

```
Before:
  Max DB connections: -
  Connection overhead: -
  Connection creation time: -

After:
  PgBouncer pool size: -
  Active connections: -
  Pooled connections: -
  Connection reuse rate: -%
  DB CPU usage: - (reduced by -%)
```

**Notes:**

- PgBouncer giúp giảm số lượng connection thực tế tới database
- Session pooling: mỗi client giữ connection suốt session
- Transaction pooling: connection được trả về pool sau mỗi transaction (tối ưu hơn)
- Giúp handle hàng nghìn concurrent users với số connection DB hạn chế

---

### Case Study 1.4: Redis Caching

**Status:** 🔴 Not Started
**Estimated:** 5 hours
**Actual:** - hours

**Goal:** Response time 200ms → 20ms, Cache hit > 90%

**Tasks:**

- [ ] Setup Redis cluster
- [ ] Implement Cache-Aside pattern
- [ ] Cache invalidation strategy
- [ ] Handle cache stampede
- [ ] Measure cache hit rate

**Metrics:**

```
Before:
  Response time: -
  DB queries/sec: -

After:
  Response time: -
  Cache hit rate: -%
  Cache miss rate: -%
  DB queries/sec: -
```

---

## 📅 MONTH 2: Async Processing

### Case Study 2.1: RabbitMQ Order Processing

**Status:** 🔴 Not Started
**Estimated:** 6 hours
**Actual:** - hours

**Goal:** Process 10k orders/min, API < 200ms

**Tasks:**

- [ ] Setup RabbitMQ
- [ ] Implement producer
- [ ] Implement consumer
- [ ] Add retry mechanism
- [ ] Setup dead letter queue
- [ ] Load test 10k orders/min

**Metrics:**

```
Before:
  API response time: -
  Orders processed/min: -

After:
  API response time: -
  Orders processed/min: -
  Failed orders: -
  Retry success rate: -%
```

---

### Case Study 2.2: Kafka Event Streaming

**Status:** 🔴 Not Started
**Estimated:** 8 hours
**Actual:** - hours

**Goal:** 100k events/sec, zero loss

**Tasks:**

- [ ] Setup Kafka + Zookeeper
- [ ] Create topics & partitions
- [ ] Implement event producer
- [ ] Implement event consumer
- [ ] CQRS pattern
- [ ] Stream processing

**Metrics:**

```
Events produced: -
Events consumed: -
Throughput: - events/sec
Lost events: -
Avg latency: - ms
```

---

## 📅 MONTH 3: Infrastructure

### Case Study 3.1: Nginx Load Balancing

**Status:** 🔴 Not Started
**Estimated:** 3 hours
**Actual:** - hours

**Goal:** Even distribution, 99.9% uptime

**Tasks:**

- [ ] Setup Nginx
- [ ] Configure load balancing
- [ ] Add health checks
- [ ] Test different algorithms
- [ ] Implement sticky sessions

**Metrics:**

```
Instances: -
Algorithm: -
Request distribution: -
Uptime: -%
Health check interval: -
```

---

### Case Study 3.2: Kubernetes

**Status:** 🔴 Not Started
**Estimated:** 8 hours
**Actual:** - hours

**Goal:** Auto-scale 3-10 pods based on load

**Tasks:**

- [ ] Install Minikube/Kind
- [ ] Dockerize services
- [ ] Write K8s manifests
- [ ] Setup HPA
- [ ] Rolling update
- [ ] Load test auto-scaling

**Metrics:**

```
Min pods: -
Max pods: -
Target CPU: -%
Pods created under load: -
Scale-up time: - seconds
Scale-down time: - seconds
```

---

## 📅 MONTH 4: Capstone Project

### Case Study 4.0: Social Media Platform

**Status:** 🔴 Not Started
**Estimated:** 40 hours
**Actual:** - hours

**Goal:** 1M users, 100k concurrent

**Features:**

- [ ] User posts (text, images)
- [ ] News feed (personalized)
- [ ] Like, comment, share
- [ ] Real-time notifications
- [ ] Search posts
- [ ] Analytics dashboard

**Architecture:**

- [ ] Database sharding
- [ ] Redis caching
- [ ] RabbitMQ for notifications
- [ ] Kafka for analytics
- [ ] Load balancing
- [ ] Kubernetes deployment

**Metrics:**

```
Users: -
Concurrent users: -
Feed generation time: - ms
Post creation time: - ms
Search time: - ms
Uptime: -%
```

---

## 📊 Metrics Summary

### Performance

| Metric             | Baseline | Current | Target   | Status |
| ------------------ | -------- | ------- | -------- | ------ |
| Query Time (p95)   | 500ms    | -       | < 50ms   | 🔴     |
| Cache Hit Rate     | 0%       | -       | > 90%    | 🔴     |
| API Response (p95) | -        | -       | < 200ms  | 🔴     |
| Queue Throughput   | -        | -       | 10k/min  | 🔴     |
| Event Throughput   | -        | -       | 100k/sec | 🔴     |

### Scale

| Metric               | Current | Target | Status |
| -------------------- | ------- | ------ | ------ |
| Max Concurrent Users | -       | 100k   | 🔴     |
| Database Shards      | 0       | 4      | 🔴     |
| Total Records        | 0       | 10M    | 🔴     |
| K8s Pods (min/max)   | -       | 3/10   | 🔴     |

---

## 💪 Skills Acquired

### Database

- [░░░░░░░░░░] Sharding (0%)
- [░░░░░░░░░░] Replication (0%)
- [░░░░░░░░░░] Connection Pooling (0%)
- [░░░░░░░░░░] Query Optimization (0%)

### Caching

- [░░░░░░░░░░] Redis (0%)
- [░░░░░░░░░░] Cache Patterns (0%)
- [░░░░░░░░░░] Invalidation (0%)

### Message Queue

- [░░░░░░░░░░] RabbitMQ (0%)
- [░░░░░░░░░░] Queue Patterns (0%)

### Event Streaming

- [░░░░░░░░░░] Kafka (0%)
- [░░░░░░░░░░] CQRS (0%)
- [░░░░░░░░░░] Stream Processing (0%)

### Infrastructure

- [░░░░░░░░░░] Docker (0%)
- [░░░░░░░░░░] Nginx (0%)
- [░░░░░░░░░░] Kubernetes (0%)

### System Design

- [░░░░░░░░░░] Architecture (0%)
- [░░░░░░░░░░] Trade-offs (0%)
- [░░░░░░░░░░] Scalability (0%)

---

## 🏆 Achievements

- [ ] 🥉 First Docker Container
- [ ] 🥉 First Database Shard
- [ ] 🥉 First Connection Pool
- [ ] 🥉 First Load Test
- [ ] 🥈 Sub-50ms Query
- [ ] 🥈 90% Cache Hit
- [ ] 🥈 1000+ Pooled Connections
- [ ] 🥈 10k Orders/Min
- [ ] 🥈 Complete Month 1
- [ ] 🥇 K8s Deployment
- [ ] 🥇 100k Concurrent
- [ ] 💎 Capstone Complete

---

## ⏱️ Time Tracking

| Week      | Hours  | Focus                 | Progress |
| --------- | ------ | --------------------- | -------- |
| 1         | 0h     | Sharding              | 0%       |
| 2         | 0h     | Replication + Caching | 0%       |
| 3         | 0h     | RabbitMQ              | 0%       |
| 4         | 0h     | Kafka                 | 0%       |
| 5         | 0h     | Load Balancing        | 0%       |
| 6-7       | 0h     | Kubernetes            | 0%       |
| 8-11      | 0h     | Capstone              | 0%       |
| **Total** | **0h** | -                     | **0%**   |

---

## 📝 Daily Log (Quick Notes)

### [Date]

- **Focus:** -
- **Hours:** -
- **Completed:**
- **Learned:**
- **Blocked:**
- **Tomorrow:**

### [Date]

...

---

## 🎯 Current Sprint

**This Week Goal:** [Case Study X.X]

**Daily Tasks:**

- [ ] Monday:
- [ ] Tuesday:
- [ ] Wednesday:
- [ ] Thursday:
- [ ] Friday:
- [ ] Weekend:

---

## 💡 Key Learnings

### Database Sharding

```
[Add learnings here as you complete]
```

### Replication

```
[Add learnings here]
```

### Connection Pooling

```
[Add learnings here]
```

### Caching

```
[Add learnings here]
```

### Message Queue

```
[Add learnings here]
```

---

## 🐛 Problems & Solutions

### Problem 1: [Title]

**Issue:**
**Solution:**
**Learned:**

### Problem 2: [Title]

...

---

## 🔗 Resources Used

### Most Helpful

- [ ] Resource 1
- [ ] Resource 2
- [ ] Resource 3

### Want to Read

- [ ] Resource 4
- [ ] Resource 5

---

## 📊 Weekly Review Template

Copy this mỗi tuần:

```markdown
## Week X Review

**Planned:** Case Study X.X
**Completed:** [Yes/No/Partial]
**Hours:** Xh / Xh estimated

**What went well:**

- **What was challenging:**

- **What I learned:**

- **Metrics achieved:**

- Metric 1: X → Y
- Metric 2: X → Y

**Next week focus:**

-
```

---

**Last Updated:** [Date]
**Next Milestone:** [Case Study X.X]
**Days Active:** 0
