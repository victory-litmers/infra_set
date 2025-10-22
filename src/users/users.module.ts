import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { ShardingService } from '../database/providers/sharding.service.js';
import { UsersShardingService } from './providers/sharding.service.js';

@Module({
  controllers: [UsersController],
  providers: [ShardingService, UsersShardingService],
  exports: [UsersShardingService],
})
export class UsersModule {}
