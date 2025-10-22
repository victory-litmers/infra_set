import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity.js';

@Injectable()
export class ShardingService implements OnModuleInit {
  private readonly dataSources: Map<number, DataSource> = new Map();
  private readonly logger = new Logger(ShardingService.name);
  private readonly numShards = 4;

  async onModuleInit() {
    this.logger.log('🔄 Initializing database shards...');

    for (let i = 0; i < this.numShards; i++) {
      await this.createShardConnection(i);
    }

    this.logger.log(`✅ Connected to ${this.numShards} shards`);
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Closing shard connections...');

    for (const [id, ds] of this.dataSources.entries()) {
      await ds.destroy();
      this.logger.log(`Closed shard ${id}`);
    }
  }

  private async createShardConnection(shardId: number) {
    const port = 5433 + shardId;

    const dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: port,
      username: 'postgres',
      password: 'postgres',
      database: `shard_${shardId}`,
      entities: [User],
      synchronize: true,
      logging: false,
      extra: {
        max: 15,
        min: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    });

    try {
      await dataSource.initialize();
      this.dataSources.set(shardId, dataSource);
      this.logger.log(`📦 Shard ${shardId} connected (port ${port})`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to connect shard ${shardId}:`,
        (error as Error).message,
      );
      throw error;
    }
  }

  /**
   * Calculate which shard a user belongs to
   */
  getShardId(userId: string): number {
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const numbericHash = parseInt(hash.substring(0, 8), 16);
    const shardId = numbericHash % this.numShards;

    this.logger.debug(`User ${userId.substring(0, 8)}... -> Shard ${shardId}`);

    return shardId;
  }

  /**
   * Get repository for a specific user
   */
  getUserRepository(userId: string): Repository<User> {
    const shardId = this.getShardId(userId);
    const dataSource = this.dataSources.get(shardId);

    if (!dataSource || !dataSource.isInitialized) {
      throw new Error(`Shard ${shardId} is not available`);
    }

    return dataSource.getRepository(User);
  }

  /**
   * Get shard DataSource directly by ID
   */
  getShardDataSource(shardId: number): DataSource {
    const dataSource = this.dataSources.get(shardId);
    if (!dataSource || !dataSource.isInitialized) {
      throw new Error(`Shard ${shardId} is not available`);
    }
    return dataSource;
  }

  /**
   * Query across ALL shards (scatter-gather)
   */
  async queryAllShards(
    queryFn: (repo: Repository<User>) => Promise<any>,
  ): Promise<any[]> {
    const promises: Promise<any>[] = [];

    for (let i = 0; i < this.numShards; i++) {
      const dataSource = this.dataSources.get(i);
      if (!dataSource || !dataSource.isInitialized) {
        throw new Error(`Shard ${i} is not available`);
      }

      const repo = dataSource.getRepository(User);
      promises.push(queryFn(repo));
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  /**
   * Get shard statistics
   */
  async getShardStats(): Promise<any[]> {
    const stats: any[] = [];

    for (let i = 0; i < this.numShards; i++) {
      const ds = this.dataSources.get(i);
      if (!ds || !ds.isInitialized) {
        throw new Error(`Shard ${i} is not available`);
      }
      const repo = ds.getRepository(User);
      const count = await repo.count();

      stats.push({
        shardId: i,
        database: `shard_${i}`,
        port: 5433 + i,
        userCount: count,
        isConnected: ds.isInitialized,
      });
    }

    return stats;
  }

  /**
   * Health check all shards
   */
  async healthCheck(): Promise<any[]> {
    const health: any[] = [];

    for (let i = 0; i < this.numShards; i++) {
      const ds = this.dataSources.get(i);
      try {
        await ds?.query('SELECT 1');
        health.push({ shardId: i, status: 'healthy' });
      } catch (error: any) {
        health.push({
          shardId: i,
          status: 'unhealthy',
          error: (error as Error).message,
        });
      }
    }

    return health;
  }
}
