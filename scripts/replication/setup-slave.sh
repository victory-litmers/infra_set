#!/bin/bash
set -e

MASTER_HOST=${MASTER_HOST:-postgres-master}
MASTER_PORT=${MASTER_PORT:-5432}
REPLICATION_USER=${REPLICATION_USER:-replicator}
REPLICATION_PASSWORD=${REPLICATION_PASSWORD:-replicator_password}

echo "🔧 Setting up Slave Replication from $MASTER_HOST..."

# Wait for master to be ready
echo "⏳ Waiting for master database..."
until PGPASSWORD=postgres pg_isready -h $MASTER_HOST -p $MASTER_PORT -U postgres; do
  sleep 2
done

echo "✅ Master is ready!"

# Stop PostgreSQL if running
if pg_ctl status > /dev/null 2>&1; then
  echo "🛑 Stopping PostgreSQL..."
  pg_ctl stop -m fast || true
  sleep 2
fi

# Remove old data directory
echo "🗑️  Cleaning old data..."
rm -rf $PGDATA/*

# Perform base backup from master
echo "📦 Performing base backup from master..."
PGPASSWORD=$REPLICATION_PASSWORD pg_basebackup \
  -h $MASTER_HOST \
  -p $MASTER_PORT \
  -U $REPLICATION_USER \
  -D $PGDATA \
  -Fp \
  -Xs \
  -P \
  -R

# Set proper permissions
chmod 700 $PGDATA

# Update postgresql.auto.conf for slave-specific settings
cat >> $PGDATA/postgresql.auto.conf <<EOF
hot_standby = on
primary_conninfo = 'host=$MASTER_HOST port=$MASTER_PORT user=$REPLICATION_USER password=$REPLICATION_PASSWORD'
EOF

# Create standby.signal to mark as replica
touch $PGDATA/standby.signal

# Set proper ownership - CRITICAL!
chown -R postgres:postgres $PGDATA

echo "✅ Slave replication setup complete!"
echo "🚀 Starting PostgreSQL as replica..."

# Start PostgreSQL as postgres user (NOT root!)
exec su-exec postgres postgres