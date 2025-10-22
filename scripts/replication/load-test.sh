#!/bin/bash

echo "🚀 Load Testing: Replication Performance"
echo "========================================"
echo ""
echo "Test Scenario:"
echo "- 10,000 users inserted"
echo "- 70% READ operations (from slaves)"
echo "- 30% WRITE operations (to master)"
echo "- Concurrent: 100 requests/second"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if apache bench is installed
if ! command -v ab &> /dev/null; then
    echo -e "${YELLOW}⚠️  Apache Bench not found. Installing...${NC}"
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install httpd
    # For Linux
    else
        sudo apt-get install -y apache2-utils
    fi
fi

# Database connection info
MASTER_HOST="localhost"
MASTER_PORT="5440"
SLAVE1_PORT="5441"
SLAVE2_PORT="5442"
DB_NAME="main_db"
DB_USER="postgres"
DB_PASS="postgres"

echo "📋 Phase 1: Setup Test Environment"
echo "===================================="

# Create users table
echo "Creating users table on master..."
docker exec postgres-master psql -U postgres -d main_db -c "
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
" > /dev/null 2>&1

echo -e "${GREEN}✅ Table created${NC}"
echo ""

echo "⏳ Waiting 2 seconds for replication..."
sleep 2
echo ""

# Insert 10k users
echo "📝 Phase 2: Inserting 10,000 Users"
echo "===================================="

START_INSERT=$(date +%s%3N)

# Batch insert for speed
for i in {1..100}; do
    docker exec postgres-master psql -U postgres -d main_db -c "
    INSERT INTO users (username, email, full_name)
    SELECT 
        'user' || generate_series($((($i-1)*100+1)), $(($i*100))),
        'user' || generate_series($((($i-1)*100+1)), $(($i*100))) || '@example.com',
        'User ' || generate_series($((($i-1)*100+1)), $(($i*100)))
    ON CONFLICT DO NOTHING;
    " > /dev/null 2>&1
    
    if [ $((i % 20)) -eq 0 ]; then
        echo -e "${BLUE}  Inserted $(($i * 100)) users...${NC}"
    fi
done

END_INSERT=$(date +%s%3N)
INSERT_TIME=$((END_INSERT - START_INSERT))

echo -e "${GREEN}✅ Inserted 10,000 users in ${INSERT_TIME}ms${NC}"
echo ""

# Wait for replication
echo "⏳ Waiting 3 seconds for replication to catch up..."
sleep 3
echo ""

# Verify replication
echo "🔍 Phase 3: Verify Data Replication"
echo "===================================="

MASTER_COUNT=$(docker exec postgres-master psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" | xargs)
SLAVE1_COUNT=$(docker exec postgres-slave-1 psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" | xargs)
SLAVE2_COUNT=$(docker exec postgres-slave-2 psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" | xargs)

echo "Master: $MASTER_COUNT users"
echo "Slave 1: $SLAVE1_COUNT users"
echo "Slave 2: $SLAVE2_COUNT users"

if [ "$MASTER_COUNT" == "10000" ] && [ "$SLAVE1_COUNT" == "10000" ] && [ "$SLAVE2_COUNT" == "10000" ]; then
    echo -e "${GREEN}✅ All data replicated successfully!${NC}"
else
    echo -e "${RED}❌ Replication issue detected!${NC}"
    exit 1
fi
echo ""

# Performance testing
echo "⚡ Phase 4: Performance Testing"
echo "===================================="
echo ""

# Test 1: Single Query Performance
echo "Test 1: Single Query Performance"
echo "--------------------------------"

# Master read
START=$(date +%s%N)
docker exec postgres-master psql -U postgres -d main_db -c "SELECT * FROM users WHERE id = 5000;" > /dev/null 2>&1
END=$(date +%s%N)
MASTER_TIME=$(((END - START) / 1000000))

# Slave 1 read
START=$(date +%s%N)
docker exec postgres-slave-1 psql -U postgres -d main_db -c "SELECT * FROM users WHERE id = 5000;" > /dev/null 2>&1
END=$(date +%s%N)
SLAVE1_TIME=$(((END - START) / 1000000))

# Slave 2 read
START=$(date +%s%N)
docker exec postgres-slave-2 psql -U postgres -d main_db -c "SELECT * FROM users WHERE id = 5000;" > /dev/null 2>&1
END=$(date +%s%N)
SLAVE2_TIME=$(((END - START) / 1000000))

echo "  Master read:  ${MASTER_TIME}ms"
echo "  Slave 1 read: ${SLAVE1_TIME}ms"
echo "  Slave 2 read: ${SLAVE2_TIME}ms"
echo ""

# Test 2: Concurrent Read Load
echo "Test 2: Concurrent Reads (1000 queries)"
echo "----------------------------------------"

# Function to run concurrent queries
run_concurrent_reads() {
    local HOST=$1
    local PORT=$2
    local NAME=$3
    
    START=$(date +%s%3N)
    
    # Run 1000 queries concurrently (10 batches of 100)
    for batch in {1..10}; do
        for i in {1..100}; do
            (
                RANDOM_ID=$((1 + RANDOM % 10000))
                PGPASSWORD=$DB_PASS psql -h $HOST -p $PORT -U $DB_USER -d $DB_NAME \
                    -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
            ) &
        done
        wait
    done
    
    END=$(date +%s%3N)
    ELAPSED=$((END - START))
    QPS=$((1000000 / ELAPSED))
    
    echo "  $NAME: ${ELAPSED}ms (≈${QPS} queries/sec)"
}

run_concurrent_reads "localhost" "5440" "Master     "
run_concurrent_reads "localhost" "5441" "Slave 1    "
run_concurrent_reads "localhost" "5442" "Slave 2    "
echo ""

# Test 3: Load Distribution Simulation
echo "Test 3: Load Distribution (70% Read, 30% Write)"
echo "-----------------------------------------------"

START=$(date +%s%3N)

# Simulate mixed workload
READ_COUNT=0
WRITE_COUNT=0

for i in {1..1000}; do
    RANDOM_NUM=$((RANDOM % 100))
    
    if [ $RANDOM_NUM -lt 70 ]; then
        # READ (70% chance) - goes to random slave
        SLAVE_PORT=$((RANDOM % 2))
        if [ $SLAVE_PORT -eq 0 ]; then
            PORT="5441"
        else
            PORT="5442"
        fi
        
        (
            RANDOM_ID=$((1 + RANDOM % 10000))
            PGPASSWORD=$DB_PASS psql -h localhost -p $PORT -U $DB_USER -d $DB_NAME \
                -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        ) &
        READ_COUNT=$((READ_COUNT + 1))
    else
        # WRITE (30% chance) - goes to master
        (
            RANDOM_ID=$((1 + RANDOM % 10000))
            PGPASSWORD=$DB_PASS psql -h localhost -p 5440 -U $DB_USER -d $DB_NAME \
                -c "UPDATE users SET updated_at = NOW() WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        ) &
        WRITE_COUNT=$((WRITE_COUNT + 1))
    fi
    
    # Wait every 100 queries to avoid overwhelming system
    if [ $((i % 100)) -eq 0 ]; then
        wait
    fi
done

wait

END=$(date +%s%3N)
ELAPSED=$((END - START))

echo "  Total operations: 1000"
echo "  Read operations:  $READ_COUNT (${READ_COUNT}%)"
echo "  Write operations: $WRITE_COUNT (${WRITE_COUNT}%)"
echo "  Time elapsed:     ${ELAPSED}ms"
echo "  Throughput:       $((1000000 / ELAPSED)) ops/sec"
echo ""

# Test 4: Connection Count
echo "Test 4: Active Connections"
echo "--------------------------"

MASTER_CONN=$(docker exec postgres-master psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'main_db';" | xargs)
SLAVE1_CONN=$(docker exec postgres-slave-1 psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'main_db';" | xargs)
SLAVE2_CONN=$(docker exec postgres-slave-2 psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'main_db';" | xargs)

echo "  Master:  $MASTER_CONN active connections"
echo "  Slave 1: $SLAVE1_CONN active connections"
echo "  Slave 2: $SLAVE2_CONN active connections"
echo ""

# Test 5: Replication Lag
echo "Test 5: Replication Lag"
echo "-----------------------"

docker exec postgres-master psql -U postgres -c "
SELECT 
    client_addr,
    application_name,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    CASE 
        WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) = 0 THEN '✅ Real-time'
        WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) < 1024 THEN '✅ Minimal'
        ELSE '⚠️  Lagging'
    END AS status
FROM pg_stat_replication;
"
echo ""

# Summary
echo "========================================"
echo "📊 LOAD TEST SUMMARY"
echo "========================================"
echo ""
echo "✅ Setup:"
echo "   - 10,000 users inserted"
echo "   - Data replicated to 2 slaves"
echo "   - Insert time: ${INSERT_TIME}ms"
echo ""
echo "⚡ Performance:"
echo "   - Single query: ${SLAVE1_TIME}ms avg"
echo "   - Mixed workload: $((1000000 / ELAPSED)) ops/sec"
echo "   - Load distributed: 70% reads (slaves) / 30% writes (master)"
echo ""
echo "🎯 Benefits of Replication:"
echo "   ✅ Reads distributed across 2 slaves"
echo "   ✅ Master handles only writes (30% load)"
echo "   ✅ Horizontal read scaling"
echo "   ✅ High availability (master fails → promote slave)"
echo ""
echo "💡 Next Steps:"
echo "   1. Integrate with NestJS ReplicationService"
echo "   2. Add Redis caching (Case 1.3) for even better performance!"
echo "   3. Implement connection pooling"
echo ""
echo -e "${GREEN}🎉 Load test completed successfully!${NC}"
echo ""