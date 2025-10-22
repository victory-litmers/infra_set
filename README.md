# 🚀 High-Traffic NestJS - Learning Project

> One project to master them all: Database Sharding, Caching, Message Queue, Kafka, K8s

## 📁 Project Structure

```
high-traffic-nestjs/
├── README.md                           # ← You are here
├── PROGRESS.md                         # Track your progress
├── docker-compose.yml                  # All infrastructure
├── package.json
├── tsconfig.json
├── nest-cli.json
│
├── docs/                               # Case study docs
│   ├── 1.1-sharding.md
│   ├── 1.2-replication.md
│   ├── 1.3-caching.md
│   ├── 2.1-rabbitmq.md
│   ├── 2.2-kafka.md
│   ├── 3.1-load-balancing.md
│   ├── 3.2-kubernetes.md
│   └── 4.0-capstone.md
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── database/                      # Case Study 1.1 & 1.2
│   │   ├── sharding.service.ts
│   │   ├── replication.service.ts
│   │   └── database.module.ts
│   │
│   ├── cache/                         # Case Study 1.3
│   │   ├── redis.service.ts
│   │   ├── cache-aside.service.ts
│   │   └── cache.module.ts
│   │
│   ├── queue/                         # Case Study 2.1
│   │   ├── rabbitmq/
│   │   │   ├── producer.service.ts
│   │   │   ├── consumer.service.ts
│   │   │   └── order.processor.ts
│   │   └── queue.module.ts
│   │
│   ├── events/                        # Case Study 2.2
│   │   ├── kafka/
│   │   │   ├── producer.service.ts
│   │   │   ├── consumer.service.ts
│   │   │   └── stream.processor.ts
│   │   └── events.module.ts
│   │
│   ├── users/                         # Domain: Users
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── entities/user.entity.ts
│   │
│   ├── orders/                        # Domain: Orders
│   │   ├── orders.controller.ts
│   │   ├── orders.service.ts
│   │   ├── orders.module.ts
│   │   └── entities/order.entity.ts
│   │
│   └── products/                      # Domain: Products
│       ├── products.controller.ts
│       ├── products.service.ts
│       ├── products.module.ts
│       └── entities/product.entity.ts
│
├── scripts/                           # Utility scripts
│   ├── seed-users.ts
│   ├── seed-products.ts
│   ├── seed-orders.ts
│   ├── benchmark.ts
│   ├── check-distribution.ts
│   └── load-tests/
│       ├── sharding.js
│       ├── caching.js
│       └── queue.js
│
├── k8s/                              # Case Study 3.2
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
│
└── nginx/                            # Case Study 3.1
    └── nginx.conf
```

---

## 🚀 Quick Start

```bash
# 1. Clone/Create project
nest new high-traffic-nestjs
cd high-traffic-nestjs

# 2. Install all dependencies
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config
npm install ioredis @nestjs/cache-manager cache-manager-redis-store
npm install @nestjs/bull bull
npm install @nestjs/microservices amqplib kafkajs
npm install @nestjs/swagger

# 3. Start all infrastructure
docker-compose up -d

# 4. Run migrations
npm run migration:run

# 5. Seed data
npm run seed

# 6. Start development
npm run start:dev
```

---

## ✅ Progress Tracker

Update `PROGRESS.md` as you go. Quick reference here:

### Month 1: Database Scaling

- [ ] 1.1 - Database Sharding (Est: 6h)
- [ ] 1.2 - Master-Slave Replication (Est: 4h)
- [ ] 1.3 - Redis Caching (Est: 4h)

### Month 2: Async Processing

- [ ] 2.1 - RabbitMQ Order Queue (Est: 6h)
- [ ] 2.2 - Kafka Event Streaming (Est: 8h)

### Month 3: Infrastructure

- [ ] 3.1 - Nginx Load Balancing (Est: 3h)
- [ ] 3.2 - Kubernetes Deployment (Est: 8h)

### Month 4: Capstone

- [ ] 4.0 - Social Media Platform (Est: 40h)

**Total:** ~80 hours (你可以 làm nhanh hơn nhiều!)

---

## 📊 Current Metrics

| Metric           | Target  | Current | Status |
| ---------------- | ------- | ------- | ------ |
| Query Time (p95) | < 50ms  | -       | 🔴     |
| Cache Hit Rate   | > 90%   | -       | 🔴     |
| Queue Throughput | 10k/min | -       | 🔴     |
| Concurrent Users | 100k    | -       | 🔴     |

Update sau mỗi case study!

---

## 🎯 Case Studies

### [1.1 - Database Sharding](docs/1.1-sharding.md)

**Goal:** Query time 500ms → < 50ms

- Setup 4 PostgreSQL shards
- Hash-based routing
- Scatter-gather queries
- **Time:** ~6 hours

### [1.2 - Master-Slave Replication](docs/1.2-replication.md)

**Goal:** Reduce master CPU 95% → 30%

- 1 master + 2 slaves
- Read/write splitting
- Handle replication lag
- **Time:** ~4 hours

### [1.3 - Redis Caching](docs/1.3-caching.md)

**Goal:** Response time 200ms → 20ms, Cache hit > 90%

- Cache-Aside pattern
- Cache invalidation
- Cache stampede handling
- **Time:** ~4 hours

### [2.1 - RabbitMQ Queue](docs/2.1-rabbitmq.md)

**Goal:** Process 10k orders/min, API < 200ms

- Async order processing
- Retry mechanism
- Dead letter queue
- **Time:** ~6 hours

### [2.2 - Kafka Streaming](docs/2.2-kafka.md)

**Goal:** 100k events/sec, zero loss

- Event producer/consumer
- CQRS pattern
- Stream processing
- **Time:** ~8 hours

### [3.1 - Load Balancing](docs/3.1-load-balancing.md)

**Goal:** Distribute load evenly, 99.9% uptime

- Nginx configuration
- Health checks
- Sticky sessions
- **Time:** ~3 hours

### [3.2 - Kubernetes](docs/3.2-kubernetes.md)

**Goal:** Auto-scale 3-10 pods based on load

- Containerize services
- K8s manifests
- HPA setup
- **Time:** ~8 hours

### [4.0 - Capstone](docs/4.0-capstone.md)

**Goal:** Production-ready social media platform

- 1M users, 100k concurrent
- All technologies combined
- **Time:** ~40 hours

---

## 🛠️ Commands Reference

### Development

```bash
npm run start:dev          # Start dev server
npm run build             # Build production
npm run test              # Run tests
npm run test:e2e          # E2E tests
```

### Database

```bash
npm run migration:generate   # Generate migration
npm run migration:run        # Run migrations
npm run seed                 # Seed all data
npm run seed:users           # Seed users only
npm run seed:products        # Seed products only
```

### Testing & Benchmarking

```bash
npm run benchmark            # Run benchmark
npm run check:distribution   # Check shard distribution
npm run load-test:sharding   # k6 test for sharding
npm run load-test:caching    # k6 test for caching
npm run load-test:queue      # k6 test for queue
```

### Docker

```bash
docker-compose up -d         # Start all containers
docker-compose down          # Stop all
docker-compose logs -f       # View logs
docker-compose ps            # List containers
```

### Kubernetes

```bash
kubectl apply -f k8s/        # Deploy to k8s
kubectl get pods             # List pods
kubectl logs -f <pod>        # View logs
kubectl scale deployment api --replicas=5  # Scale
```

---

## 📚 Learning Resources

### Documentation

- [NestJS Docs](https://docs.nestjs.com)
- [TypeORM Docs](https://typeorm.io)
- [Redis Commands](https://redis.io/commands/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Kafka Docs](https://kafka.apache.org/documentation/)
- [k6 Docs](https://k6.io/docs/)

### Books

- Designing Data-Intensive Applications
- System Design Interview Vol 1 & 2

### Videos

- Hussein Nasser - Database Engineering
- ByteByteGo - System Design
- NestJS Official Channel

---

## 💡 Tips for Speed Learning

1. **Don't read ahead too much** - Jump straight to coding
2. **Use ChatGPT/Claude** - Debug errors quickly
3. **Skip perfection** - Working > Perfect
4. **Measure everything** - Before/after metrics
5. **Document as you go** - Update PROGRESS.md daily

---

## 🎯 Daily Workflow

```bash
# Morning
cat PROGRESS.md              # Check today's goal
cd docs && cat 1.1-sharding.md  # Read current case study

# During day
npm run start:dev            # Code
npm run benchmark            # Test

# Evening
vim PROGRESS.md              # Update progress
git commit -am "Completed sharding implementation"
```

---

## 🐛 Common Issues

### Port already in use

```bash
lsof -i :5432  # Find process
kill -9 <PID>  # Kill it
```

### Docker container won't start

```bash
docker-compose logs <service>  # Check logs
docker-compose down -v         # Clean volumes
docker-compose up -d           # Restart
```

### TypeORM connection failed

```bash
# Check .env file
# Verify database is running: docker ps
# Test connection: psql -h localhost -p 5432 -U postgres
```

---

## 📸 Screenshots to Keep

As you progress, save:

- [ ] docker ps showing all containers
- [ ] Benchmark results before/after
- [ ] k6 load test results
- [ ] Grafana dashboards
- [ ] kubectl get pods output

Store in `screenshots/` folder

---

## 🏁 Completion Checklist

You've mastered high-traffic systems when:

- [x] All 16 case studies completed
- [x] All metrics achieved
- [x] Capstone project deployed
- [x] Load test: 100k concurrent users passed
- [x] Code on GitHub
- [x] Blog post written
- [x] LinkedIn post shared

---

## 🎓 Next Steps After Completion

1. **Contribute to open source** - Apply knowledge to real projects
2. **Build portfolio projects** - Showcase your skills
3. **Prepare system design interviews** - You're ready!
4. **Apply for senior roles** - You have the experience now

---

## 📞 Support

**Stuck?**

- Check docs/ folder for detailed guides
- Google: "[error] + nestjs"
- Ask ChatGPT/Claude with error message
- Stack Overflow: nestjs tag

**Progress sharing:**

- GitHub: Push code regularly
- LinkedIn: Share milestones
- Twitter: Show metrics
- Dev.to: Write tutorials

---

**Ready? Start with [docs/1.1-sharding.md](docs/1.1-sharding.md)! 🚀**

Last updated: [Your date]
Current: Case Study 1.1
Status: Not Started
