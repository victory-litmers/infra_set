import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ShardingService } from '../../database/providers/sharding.service.js';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../entities/user.entity.js';

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

  constructor(private readonly shardingService: ShardingService) {}

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

    this.logger.log(`User ${userId.substring(0, 8)} created successfully`);

    return user;
  }

  /**
   * READ: Get user from correct shard
   */
  async findOne(userId: string): Promise<User> {
    const startTime = Date.now();

    const repo = this.shardingService.getUserRepository(userId);
    const user = await repo.findOne({ where: { id: userId } });

    const queryTime = Date.now() - startTime;
    this.logger.debug(`⚡ Query time: ${queryTime}ms`);

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
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

    return updatedUser;
  }

  /**
   * DELETE: Remove user from correct shard
   */
  async remove(userId: string): Promise<void> {
    const repo = this.shardingService.getUserRepository(userId);

    const result = await repo.delete(userId);

    if (result.affected === 0) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    this.logger.log(`User ${userId.substring(0, 8)} deleted successfully`);
  }

  /**
   * LIST ALL: Query across all shards
   */
  async findAll(limit: number = 100): Promise<User[]> {
    this.logger.log(`🔍 Querying all shards (limit: ${limit})`);

    const startTime = Date.now();

    const users = await this.shardingService.queryAllShards(async (repo) => {
      return repo.find({
        take: Math.ceil(limit / 4),
        order: { createdAt: 'DESC' },
      });
    });

    const queryTime = Date.now() - startTime;
    this.logger.log(`⚡ Cross-shard query time: ${queryTime}ms`);

    return users as User[];
  }

  /**
   * SEARCH: Find user by email (cross-shard)
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`🔍 Searching for email: ${email}`);

    const results = await this.shardingService.queryAllShards(async (repo) => {
      return repo.find({ where: { email } });
    });

    return results[0] as User;
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
}
