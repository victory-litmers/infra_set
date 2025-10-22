import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  directConnectionOptions,
  pgbouncerConnectionOptions,
} from '../config/pooling.config.js';

@Injectable()
export class PoolingService implements OnModuleInit {
  private directDataSource: DataSource;
  private pgbouncerDataSource: DataSource;

  async onModuleInit() {
    this.directDataSource = new DataSource(directConnectionOptions);
    await this.directDataSource.initialize();
    console.log('✅ Direct database connected');
    this.pgbouncerDataSource = new DataSource(pgbouncerConnectionOptions);
    await this.pgbouncerDataSource.initialize();
    console.log('✅ PgBouncer database connected');
  }

  async onModuleDestroy() {
    await this.directDataSource.destroy();
    await this.pgbouncerDataSource.destroy();
  }

  /**
   * Get PostgreSQL connection stats
   */
  async getPostgresStats() {
    const result = await this.directDataSource.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        max_conn.setting::int as max_connections
      FROM pg_stat_activity
      CROSS JOIN (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn
      WHERE pid <> pg_backend_pid()
    `);

    return result[0];
  }

  /**
   * Get PgBouncer stats (connect directly to PgBouncer admin)
   */
  async getPgBouncerStats() {
    try {
      // SHOW POOLS
      const pools = await this.pgbouncerDataSource.query('SHOW POOLS');

      // SHOW STATS
      const stats = await this.pgbouncerDataSource.query('SHOW STATS');

      // SHOW DATABASES
      const databases = await this.pgbouncerDataSource.query('SHOW DATABASES');

      return {
        pools: pools[0],
        stats: stats[0],
        databases: databases[0],
      };
    } finally {
      await this.pgbouncerDataSource.destroy();
    }
  }

  /**
   * Pretty print stats
   */
  async printStats() {
    console.log('\n📊 === Connection Stats ===');

    // PostgreSQL stats
    const pgStats = await this.getPostgresStats();
    console.log('\n🐘 PostgreSQL:');
    console.log(`  Total connections: ${pgStats.total_connections}`);
    console.log(`  Active: ${pgStats.active_connections}`);
    console.log(`  Idle: ${pgStats.idle_connections}`);
    console.log(`  Max allowed: ${pgStats.max_connections}`);

    // PgBouncer stats
    const pbStats = await this.getPgBouncerStats();
    console.log('\n🔀 PgBouncer:');
    console.log(
      `  Client connections: ${pbStats.pools.cl_active + pbStats.pools.cl_waiting}`,
    );
    console.log(
      `  Server connections: ${pbStats.pools.sv_active + pbStats.pools.sv_idle}`,
    );
    console.log(`  Active: ${pbStats.pools.sv_active}`);
    console.log(`  Idle: ${pbStats.pools.sv_idle}`);
    console.log(`  Pool size: ${pbStats.databases.pool_size}`);

    console.log('\n========================\n');
  }
}
