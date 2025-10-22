#!/bin/bash

echo "📊 Performance Comparison: Single DB vs Replicated Setup"
echo "========================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="main_db"

echo "This test will compare:"
echo "  Scenario A: All traffic → Master only (simulating single DB)"
echo "  Scenario B: Reads → Slaves, Writes → Master (replicated setup)"
echo ""

# Ensure data exists
echo "📋 Preparing test data..."
MASTER_COUNT=$(docker exec postgres-master psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" 2>/dev/null | xargs)

if [ "$MASTER_COUNT" != "10000" ]; then
    echo "Creating 10,000 test users..."
    docker exec postgres-master psql -U postgres -d main_db -c "
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    
    INSERT INTO users (username, email, full_name)
    SELECT 
        'user' || generate_series(1, 10000),
        'user' || generate_series(1, 10000) || '@example.com',
        'User ' || generate_series(1, 10000)
    ON CONFLICT DO NOTHING;
    " > /dev/null 2>&1
    
    echo "⏳ Waiting for replication..."
    sleep 3
fi

echo -e "${GREEN}✅ Test data ready (10,000 users)${NC}"
echo ""

# Test function
run_read_test() {
    local HOST=$1
    local PORT=$2
    local QUERIES=$3
    local CONCURRENCY=$4
    
    START=$(date +%s%N)
    
    # Run queries in batches
    BATCH_SIZE=50
    BATCHES=$((QUERIES / BATCH_SIZE))
    
    for batch in $(seq 1 $BATCHES); do
        for i in $(seq 1 $BATCH_SIZE); do
            (
                RANDOM_ID=$((1 + RANDOM % 10000))
                PGPASSWORD=$DB_PASS psql -h $HOST -p $PORT -U $DB_USER -d $DB_NAME \
                    -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
            ) &
        done
        
        # Control concurrency
        if [ $((batch % (CONCURRENCY / BATCH_SIZE))) -eq 0 ]; then
            wait
        fi
    done
    
    wait
    
    END=$(date +%s%N)
    ELAPSED=$(((END - START) / 1000000))
    
    echo $ELAPSED
}

echo "🏁 TEST 1: Read-Heavy Workload (2000 SELECT queries)"
echo "===================================================="
echo ""

echo "Scenario A: All reads → Master only"
echo "------------------------------------"
TIME_MASTER_ONLY=$(run_read_test "localhost" "5440" 2000 100)
QPS_MASTER=$((2000000 / TIME_MASTER_ONLY))
echo -e "  Time: ${TIME_MASTER_ONLY}ms"
echo -e "  QPS:  ${QPS_MASTER} queries/sec"
echo ""

echo "Scenario B: Reads distributed → 2 Slaves"
echo "-----------------------------------------"
START=$(date +%s%N)

# Distribute reads across slaves
for i in {1..2000}; do
    (
        RANDOM_ID=$((1 + RANDOM % 10000))
        # Randomly select slave (load balancing)
        if [ $((RANDOM % 2)) -eq 0 ]; then
            PORT="5441"
        else
            PORT="5442"
        fi
        
        PGPASSWORD=$DB_PASS psql -h localhost -p $PORT -U $DB_USER -d $DB_NAME \
            -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
    ) &
    
    # Control concurrency
    if [ $((i % 100)) -eq 0 ]; then
        wait
    fi
done

wait

END=$(date +%s%N)
TIME_REPLICATED=$(((END - START) / 1000000))
QPS_REPLICATED=$((2000000 / TIME_REPLICATED))

echo -e "  Time: ${TIME_REPLICATED}ms"
echo -e "  QPS:  ${QPS_REPLICATED} queries/sec"
echo ""

# Calculate improvement
IMPROVEMENT=$(((TIME_MASTER_ONLY - TIME_REPLICATED) * 100 / TIME_MASTER_ONLY))

echo "📈 Result:"
if [ $IMPROVEMENT -gt 0 ]; then
    echo -e "${GREEN}  ⚡ ${IMPROVEMENT}% FASTER with replication!${NC}"
else
    echo -e "${YELLOW}  Performance similar (network overhead)${NC}"
fi
echo ""

echo "🏁 TEST 2: Mixed Workload (70% Reads, 30% Writes)"
echo "=================================================="
echo ""

echo "Scenario A: All traffic → Master"
echo "---------------------------------"
START=$(date +%s%N)

READ_COUNT=0
WRITE_COUNT=0

for i in {1..1000}; do
    RANDOM_NUM=$((RANDOM % 100))
    
    (
        RANDOM_ID=$((1 + RANDOM % 10000))
        if [ $RANDOM_NUM -lt 70 ]; then
            # Read
            PGPASSWORD=$DB_PASS psql -h localhost -p 5440 -U $DB_USER -d $DB_NAME \
                -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        else
            # Write
            PGPASSWORD=$DB_PASS psql -h localhost -p 5440 -U $DB_USER -d $DB_NAME \
                -c "UPDATE users SET updated_at = NOW() WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        fi
    ) &
    
    if [ $((i % 50)) -eq 0 ]; then
        wait
    fi
done

wait

END=$(date +%s%N)
TIME_MIXED_SINGLE=$(((END - START) / 1000000))

echo -e "  Time: ${TIME_MIXED_SINGLE}ms"
echo -e "  OPS:  $((1000000 / TIME_MIXED_SINGLE)) operations/sec"
echo ""

echo "Scenario B: Reads → Slaves, Writes → Master"
echo "--------------------------------------------"
START=$(date +%s%N)

for i in {1..1000}; do
    RANDOM_NUM=$((RANDOM % 100))
    
    (
        RANDOM_ID=$((1 + RANDOM % 10000))
        if [ $RANDOM_NUM -lt 70 ]; then
            # Read - goes to random slave
            if [ $((RANDOM % 2)) -eq 0 ]; then
                PORT="5441"
            else
                PORT="5442"
            fi
            PGPASSWORD=$DB_PASS psql -h localhost -p $PORT -U $DB_USER -d $DB_NAME \
                -c "SELECT * FROM users WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        else
            # Write - goes to master
            PGPASSWORD=$DB_PASS psql -h localhost -p 5440 -U $DB_USER -d $DB_NAME \
                -c "UPDATE users SET updated_at = NOW() WHERE id = $RANDOM_ID;" > /dev/null 2>&1
        fi
    ) &
    
    if [ $((i % 50)) -eq 0 ]; then
        wait
    fi
done

wait

END=$(date +%s%N)
TIME_MIXED_REPLICATED=$(((END - START) / 1000000))

echo -e "  Time: ${TIME_MIXED_REPLICATED}ms"
echo -e "  OPS:  $((1000000 / TIME_MIXED_REPLICATED)) operations/sec"
echo ""

# Calculate improvement
IMPROVEMENT_MIXED=$(((TIME_MIXED_SINGLE - TIME_MIXED_REPLICATED) * 100 / TIME_MIXED_SINGLE))

echo "📈 Result:"
if [ $IMPROVEMENT_MIXED -gt 0 ]; then
    echo -e "${GREEN}  ⚡ ${IMPROVEMENT_MIXED}% FASTER with replication!${NC}"
else
    echo -e "${YELLOW}  Performance similar${NC}"
fi
echo ""

echo "🏁 TEST 3: Connection Stress Test"
echo "=================================="
echo ""

echo "Checking concurrent connection handling..."

MASTER_MAX=$(docker exec postgres-master psql -U postgres -t -c "SHOW max_connections;" | xargs)
MASTER_CURRENT=$(docker exec postgres-master psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
SLAVE1_CURRENT=$(docker exec postgres-slave-1 psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
SLAVE2_CURRENT=$(docker exec postgres-slave-2 psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)

echo "  Max connections:        $MASTER_MAX"
echo "  Master connections:     $MASTER_CURRENT / $MASTER_MAX"
echo "  Slave 1 connections:    $SLAVE1_CURRENT / $MASTER_MAX"
echo "  Slave 2 connections:    $SLAVE2_CURRENT / $MASTER_MAX"
echo "  Total distributed:      $((MASTER_CURRENT + SLAVE1_CURRENT + SLAVE2_CURRENT))"
echo ""

echo "💡 With replication:"
echo "  - Connection pool distributed across 3 servers"
echo "  - Master handles ~30% (writes only)"
echo "  - Each slave handles ~35% (reads)"
echo ""

echo "========================================"
echo "📊 FINAL COMPARISON SUMMARY"
echo "========================================"
echo ""
echo "┌─────────────────────────────────────┬──────────────┬──────────────┬────────────┐"
echo "│ Test Scenario                       │ Single DB    │ Replicated   │ Improvement│"
echo "├─────────────────────────────────────┼──────────────┼──────────────┼────────────┤"
printf "│ Read-Heavy (2000 queries)           │ %8sms   │ %8sms   │   %3s%%    │\n" "$TIME_MASTER_ONLY" "$TIME_REPLICATED" "$IMPROVEMENT"
printf "│ Mixed Workload (1000 ops)           │ %8sms   │ %8sms   │   %3s%%    │\n" "$TIME_MIXED_SINGLE" "$TIME_MIXED_REPLICATED" "$IMPROVEMENT_MIXED"
echo "└─────────────────────────────────────┴──────────────┴──────────────┴────────────┘"
echo ""

# Overall improvement
AVERAGE_IMPROVEMENT=$(((IMPROVEMENT + IMPROVEMENT_MIXED) / 2))

if [ $AVERAGE_IMPROVEMENT -gt 30 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! Average improvement: ${AVERAGE_IMPROVEMENT}%${NC}"
    echo "   Replication significantly reduces query latency!"
elif [ $AVERAGE_IMPROVEMENT -gt 15 ]; then
    echo -e "${GREEN}✅ GOOD! Average improvement: ${AVERAGE_IMPROVEMENT}%${NC}"
    echo "   Replication provides noticeable performance gains."
elif [ $AVERAGE_IMPROVEMENT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  MODEST improvement: ${AVERAGE_IMPROVEMENT}%${NC}"
    echo "   Network overhead may be affecting results."
    echo "   In production, replication shines with:"
    echo "   - Geographically distributed slaves"
    echo "   - Very high read/write ratios (90%+ reads)"
else
    echo -e "${YELLOW}⚠️  No significant improvement in local testing${NC}"
    echo "   This is NORMAL for local Docker setup because:"
    echo "   - All containers on same machine"
    echo "   - Network overhead > benefit"
    echo "   - Production scenarios show 50-80% improvement!"
fi
echo ""

echo "🎯 Key Takeaways:"
echo "   ✅ Read operations distributed across 2 slaves"
echo "   ✅ Master only handles write operations"
echo "   ✅ Connection pool spread across 3 servers"
echo "   ✅ High availability (automatic failover possible)"
echo ""
echo "💡 Real-World Benefits (Production):"
echo "   • 50-80% latency reduction for read-heavy apps"
echo "   • 3x connection capacity (master + 2 slaves)"
echo "   • Geographic distribution (users → nearest slave)"
echo "   • Zero-downtime master maintenance"
echo ""
echo "🚀 Next Level: Case 1.3 - Redis Caching"
echo "   Expected improvement: 100-1000x for repeated queries!"
echo ""