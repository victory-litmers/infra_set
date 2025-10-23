import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { ShardingService } from '../database/providers/sharding.service.js';
import { UsersShardingService } from './providers/sharding.service.js';
import { CacheAsideService } from '../cache/cache-aside.service.js';
import { CacheModule } from '../cache/cache.module.js';

@Module({
  imports: [CacheModule],
  controllers: [UsersController],
  providers: [ShardingService, UsersShardingService, CacheAsideService],
  exports: [UsersShardingService],
})
export class UsersModule {}
