import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisType } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisType;

  private readonly readClient: RedisType;

  constructor(private configService: ConfigService) {
    this.client = new (Redis as any)({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', 'redis123'),
    });

    const slavePort = Math.random() < 0.5 ? 6380 : 6381;
    this.readClient = new (Redis as any)({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: slavePort,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.readClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value to cache with TTL (seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.readClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Error setting TTL for key ${key}:`, error);
    }
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.readClient.ttl(key);
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment counter (useful for rate limiting, analytics)
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): RedisType {
    return this.client;
  }
}
