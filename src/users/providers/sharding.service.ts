import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ShardingService } from '../../database/providers/sharding.service.js';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../entities/user.entity.js';
import { CacheAsideService } from '../../cache/cache-aside.service.js';

export class CreateUserDto {
  email: string;
  username: string;
  fullName?: string;
}

export class UpdateUserDto {
  email?: string;
  username?: string;
  fullName?: string;
}

@Injectable()
export class UsersShardingService {
  private readonly logger = new Logger(UsersShardingService.name);

  // Cache TTL constants
  private readonly USER_CACHE_TTL = 300;
  private readonly USER_LIST_CACHE_TTL = 60;
  private readonly STATS_CACHE_TTL = 300;

  constructor(
    private readonly shardingService: ShardingService,
    private readonly cacheService: CacheAsideService,
  ) {}

  /**
   * CREATE: Insert user into correct shard
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const userId = uuidv7();
    const shardId = this.shardingService.getShardId(userId);

    this.logger.log(
      `Creating user ${userId.substring(0, 8)}... in shard ${shardId}`,
    );

    const repo = this.shardingService.getUserRepository(userId);
    const user = repo.create({ id: userId, ...createUserDto });

    await repo.save(user);

    // Invalidate cache
    await this.cacheService.invalidatePattern(`users:all*`);
    await this.cacheService.invalidatePattern(`users:stats:*`);

    this.logger.log(`User ${userId.substring(0, 8)} created successfully`);

    return user;
  }

  /**
   * READ: Get user from correct shard
   */
  async findOne(userId: string): Promise<User> {
    const cacheKey = `users:${userId}`;

    return this.cacheService.get(
      cacheKey,
      async () => {
        const startTime = Date.now();
        const repo = this.shardingService.getUserRepository(userId);
        const user = await repo.findOne({ where: { id: userId } });

        const queryTime = Date.now() - startTime;
        this.logger.debug(`⚡ Query time: ${queryTime}ms`);

        if (!user) {
          throw new NotFoundException(`User ${userId} not found`);
        }

        return user;
      },
      this.USER_CACHE_TTL,
    );
  }

  /**
   * UPDATE: Update user in correct shard
   */
  async update(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const repo = this.shardingService.getUserRepository(userId);

    const user = await repo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const updatedUser = repo.merge(user, updateUserDto);
    await repo.save(updatedUser);

    // Invalidate cache
    await this.invalidateUserCaches(userId, user.email, updateUserDto.email);

    // Warm cache with new data
    const cacheKey = `user:${userId}`;
    await this.cacheService.refresh(
      cacheKey,
      () => Promise.resolve(updatedUser),
      this.USER_CACHE_TTL,
    );

    return updatedUser;
  }

  /**
   * DELETE: Remove user from correct shard
   */
  async remove(userId: string): Promise<void> {
    const repo = this.shardingService.getUserRepository(userId);

    // Get user first to get email
    const user = await repo.findOne({ where: { id: userId } });

    const result = await repo.delete(userId);

    if (result.affected === 0) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.invalidateUserCaches(userId, user?.email);

    this.logger.log(`User ${userId.substring(0, 8)} deleted successfully`);
  }

  /**
   * LIST ALL: Query across all shards
   */
  async findAll(limit: number = 100): Promise<User[]> {
    const cacheKey = `users:all:limit:${limit}`;

    return this.cacheService.get(
      cacheKey,
      async () => {
        const startTime = Date.now();

        const users = await this.shardingService.queryAllShards(
          async (repo) => {
            return repo.find({
              take: Math.ceil(limit / 4),
              order: { createdAt: 'DESC' },
            });
          },
        );

        const queryTime = Date.now() - startTime;
        this.logger.log(`⚡ Cross-shard query time: ${queryTime}ms`);

        return users as User[];
      },
      this.USER_LIST_CACHE_TTL,
    );
  }

  /**
   * SEARCH: Find user by email (cross-shard)
   */
  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `users:email:${email}`;

    return this.cacheService.get(
      cacheKey,
      async () => {
        this.logger.log(`🔍 Searching for email: ${email}`);

        const results = await this.shardingService.queryAllShards(
          async (repo) => {
            return repo.find({ where: { email } });
          },
        );

        return results[0] ?? null;
      },
      this.USER_CACHE_TTL,
    );
  }
  /**
   * STATS: Get shard distribution
   */
  async getStats() {
    return this.shardingService.getShardStats();
  }

  /**
   * HEALTH: Check shard health
   */
  async healthCheck() {
    return this.shardingService.healthCheck();
  }

  /**
   * Helper: Invalidate all caches related to a user
   */
  private async invalidateUserCaches(
    userId: string,
    oldEmail?: string,
    newEmail?: string,
  ): Promise<void> {
    // Individual user cache
    await this.cacheService.invalidate(`user:${userId}`);

    // Email-based caches
    if (oldEmail) {
      await this.cacheService.invalidate(`user:email:${oldEmail}`);
    }
    if (newEmail && newEmail !== oldEmail) {
      await this.cacheService.invalidate(`user:email:${newEmail}`);
    }

    // List and stats caches
    await this.cacheService.invalidatePattern('users:all*');
    await this.cacheService.invalidatePattern('users:stats:*');

    this.logger.debug(`Invalidated all caches for user ${userId}`);
  }
}
