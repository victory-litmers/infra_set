#!/bin/bash
set -e

echo "🔧 Setting up Master for Replication..."

# Wait for PostgreSQL to be ready
until pg_isready -U postgres; do
  echo "⏳ Waiting for PostgreSQL to start..."
  sleep 2
done

# Create replication user
psql -v ON_ERROR_STOP=1 --username postgres <<-EOSQL
    -- Create replication user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'replicator') THEN
            CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_password';
        END IF;
    END
    \$\$;
    
    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE main_db TO replicator;
EOSQL

# Configure pg_hba.conf to allow replication connections
echo "host replication replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"
echo "host all replicator 0.0.0.0/0 md5" >> "$PGDATA/pg_hba.conf"

# Reload configuration
psql -U postgres -c "SELECT pg_reload_conf();"

echo "✅ Master replication setup complete!"