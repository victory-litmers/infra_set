import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * Cache-Aside Pattern với Cache Stampede Prevention
 *
 * Cache Stampede xảy ra khi:
 * - Cache expire
 * - Nhiều requests đồng thời phát hiện cache miss
 * - Tất cả đều query DB cùng lúc → DB overload
 *
 * Solution: Sử dụng "lock" để chỉ cho 1 request query DB
 */
@Injectable()
export class CacheAsideService {
  private readonly logger = new Logger(CacheAsideService.name);
  private readonly lockTTL = 10; // Lock timeout 10 seconds
  private readonly pendingRequests = new Map<string, Promise<any>>();

  constructor(private redisService: RedisService) {}

  /**
   * Cache-Aside Pattern with Stampede Prevention
   *
   * @param key Cache key
   * @param fetchFunction Function to fetch data from DB
   * @param ttl Cache TTL in seconds
   */
  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 300, // Default 5 minutes
  ): Promise<T> {
    // Step 1: Try to get from cache
    const cached = await this.redisService.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT: ${key}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${key}`);

    // Step 2: Prevent cache stampede
    const lockKey = `lock:${key}`;

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      this.logger.debug(`Waiting for pending request: ${key}`);
      return this.pendingRequests.get(key);
    }

    // Try to acquire lock
    const locked = await this.acquireLock(lockKey);

    if (locked) {
      // This request won the race, fetch from DB
      const promise = this.fetchAndCache(key, fetchFunction, ttl);
      this.pendingRequests.set(key, promise);

      try {
        const result = await promise;
        return result;
      } finally {
        this.pendingRequests.delete(key);
        await this.releaseLock(lockKey);
      }
    } else {
      // Another request is fetching, wait a bit and retry reading cache
      await this.sleep(50); // Wait 50ms
      return this.get(key, fetchFunction, ttl);
    }
  }

  /**
   * Fetch data from DB and cache it
   */
  private async fetchAndCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    try {
      this.logger.debug(`Fetching from DB: ${key}`);
      const data = await fetchFunction();

      // Cache the result
      await this.redisService.set(key, data, ttl);
      this.logger.debug(`Cached successfully: ${key}`);

      return data;
    } catch (error) {
      this.logger.error(`Error fetching data for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Acquire distributed lock using Redis SETNX
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.set(
      lockKey,
      '1',
      'EX',
      this.lockTTL,
      'NX', // Only set if not exists
    );
    return result === 'OK';
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await this.redisService.del(lockKey);
  }

  /**
   * Invalidate cache (single key)
   */
  async invalidate(key: string): Promise<void> {
    await this.redisService.del(key);
    this.logger.debug(`Cache invalidated: ${key}`);
  }

  /**
   * Invalidate cache (pattern)
   * Example: invalidatePattern('user:*') deletes all user caches
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.redisService.delPattern(pattern);
    this.logger.debug(`Cache pattern invalidated: ${pattern}`);
  }

  /**
   * Refresh cache (update without waiting for expiry)
   */
  async refresh<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 300,
  ): Promise<T> {
    const data = await fetchFunction();
    await this.redisService.set(key, data, ttl);
    return data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
