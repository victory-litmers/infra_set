import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service.js';
import { CacheAsideService } from './cache-aside.service.js';

@Module({
  imports: [ConfigModule],
  providers: [RedisService, CacheAsideService],
  exports: [RedisService, CacheAsideService],
})
export class CacheModule {}
