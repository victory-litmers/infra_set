#!/bin/bash

echo "🌱 Seeding 10,000 Users for Replication Testing"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check master is running
if ! docker ps | grep -q postgres-master; then
    echo -e "${RED}❌ postgres-master is not running!${NC}"
    echo "Start it with: docker-compose up -d postgres-master"
    exit 1
fi

echo "📋 Step 1: Creating users table on Master"
echo "=========================================="

docker exec postgres-master psql -U postgres -d main_db -c "
-- Drop existing table if any
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    age INTEGER,
    city VARCHAR(50),
    country VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_country ON users(country);
CREATE INDEX idx_users_created_at ON users(created_at);
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Table created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create table${NC}"
    exit 1
fi
echo ""

echo "📝 Step 2: Inserting 10,000 users"
echo "=================================="
echo "This will take about 10-20 seconds..."
echo ""

START_TIME=$(date +%s)

# Sample data arrays
CITIES=("New York" "Los Angeles" "Chicago" "Houston" "Phoenix" "Philadelphia" "San Antonio" "San Diego" "Dallas" "San Jose")
COUNTRIES=("USA" "Canada" "UK" "Germany" "France" "Japan" "Australia" "Brazil" "India" "Singapore")

# Insert in batches of 1000 for better performance
for batch in {1..10}; do
    START_ID=$(( ($batch - 1) * 1000 + 1 ))
    END_ID=$(( $batch * 1000 ))
    
    echo -e "${BLUE}  Inserting users $START_ID - $END_ID...${NC}"
    
    docker exec postgres-master psql -U postgres -d main_db -c "
    INSERT INTO users (username, email, full_name, age, city, country)
    SELECT 
        'user' || generate_series($START_ID, $END_ID),
        'user' || generate_series($START_ID, $END_ID) || '@example.com',
        'User ' || generate_series($START_ID, $END_ID),
        18 + (random() * 60)::integer,
        (ARRAY['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 
               'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'])[ceil(random() * 10)],
        (ARRAY['USA', 'Canada', 'UK', 'Germany', 'France', 
               'Japan', 'Australia', 'Brazil', 'India', 'Singapore'])[ceil(random() * 10)]
    ON CONFLICT (username) DO NOTHING;
    " > /dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed at batch $batch${NC}"
        exit 1
    fi
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}✅ Successfully inserted 10,000 users in ${ELAPSED} seconds${NC}"
echo ""

echo "⏳ Step 3: Waiting for replication (5 seconds)..."
echo "================================================"
sleep 5
echo ""

echo "🔍 Step 4: Verifying data across all databases"
echo "=============================================="

# Count users in each database
MASTER_COUNT=$(docker exec postgres-master psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" 2>/dev/null | xargs)
SLAVE1_COUNT=$(docker exec postgres-slave-1 psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" 2>/dev/null | xargs)
SLAVE2_COUNT=$(docker exec postgres-slave-2 psql -U postgres -d main_db -t -c "SELECT count(*) FROM users;" 2>/dev/null | xargs)

echo "  Master:  $MASTER_COUNT users"
echo "  Slave 1: $SLAVE1_COUNT users"
echo "  Slave 2: $SLAVE2_COUNT users"
echo ""

# Verify all have same count
if [ "$MASTER_COUNT" == "10000" ] && [ "$SLAVE1_COUNT" == "10000" ] && [ "$SLAVE2_COUNT" == "10000" ]; then
    echo -e "${GREEN}🎉 SUCCESS! All databases have 10,000 users${NC}"
    echo ""
    
    # Show some sample data
    echo "📊 Sample Data Preview:"
    echo "----------------------"
    docker exec postgres-master psql -U postgres -d main_db -c "
    SELECT id, username, email, city, country, age 
    FROM users 
    ORDER BY random() 
    LIMIT 5;
    "
    echo ""
    
    # Show replication status
    echo "🔄 Replication Status:"
    echo "---------------------"
    docker exec postgres-master psql -U postgres -c "
    SELECT 
        application_name,
        client_addr,
        state,
        pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
    FROM pg_stat_replication;
    "
    echo ""
    
    echo "✅ Ready for load testing!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./compare-performance.sh"
    echo "  2. Or:  ./load-test-replication.sh"
    echo ""
    
elif [ "$MASTER_COUNT" == "10000" ]; then
    echo -e "${YELLOW}⚠️  Master has data but slaves are not synced yet${NC}"
    echo ""
    echo "This might happen if:"
    echo "  - Slaves just started (wait 10-30 seconds more)"
    echo "  - Replication is broken (check logs)"
    echo ""
    echo "Check slave logs:"
    echo "  docker logs postgres-slave-1 --tail 20"
    echo "  docker logs postgres-slave-2 --tail 20"
    echo ""
    
else
    echo -e "${RED}❌ Data insertion or replication failed!${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check master: docker logs postgres-master --tail 20"
    echo "  2. Check slaves: docker logs postgres-slave-1 --tail 20"
    echo "  3. Verify replication: docker exec postgres-master psql -U postgres -c 'SELECT * FROM pg_stat_replication;'"
    echo ""
fi

echo "========================================"
echo "🎯 Summary"
echo "========================================"
echo "  Insert time:     ${ELAPSED}s"
echo "  Master records:  $MASTER_COUNT"
echo "  Slave 1 records: $SLAVE1_COUNT"
echo "  Slave 2 records: $SLAVE2_COUNT"
echo ""

if [ "$MASTER_COUNT" == "10000" ] && [ "$SLAVE1_COUNT" == "10000" ] && [ "$SLAVE2_COUNT" == "10000" ]; then
    exit 0
else
    exit 1
fi