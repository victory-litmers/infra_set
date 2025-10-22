import { Controller, Get } from '@nestjs/common';
import { PoolingService } from '../providers/pooling.service.js';

@Controller('pooling')
export class PoolingController {
  constructor(private poolingService: PoolingService) {}

  @Get('stats')
  async getStats() {
    const pgStats = await this.poolingService.getPostgresStats();
    const pbStats = await this.poolingService.getPgBouncerStats();

    return {
      postgres: pgStats,
      pgbouncer: pbStats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('print')
  async printStats() {
    await this.poolingService.printStats();
    return { message: 'Stats printed to console' };
  }
}
