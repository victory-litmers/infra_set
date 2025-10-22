// replication.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  masterDataSourceOptions,
  slave1DataSourceOptions,
  slave2DataSourceOptions,
} from '../config/replication.config.js';

@Injectable()
export class ReplicationService implements OnModuleInit {
  private masterDataSource: DataSource;
  private slaveDataSources: DataSource[] = [];
  private currentSlaveIndex = 0;

  async onModuleInit() {
    // Initialize Master
    this.masterDataSource = new DataSource(masterDataSourceOptions);
    await this.masterDataSource.initialize();
    console.log('✅ Master DB connected');

    // Initialize Slaves
    const slave1 = new DataSource(slave1DataSourceOptions);
    const slave2 = new DataSource(slave2DataSourceOptions);

    await slave1.initialize();
    await slave2.initialize();

    this.slaveDataSources.push(slave1, slave2);
    console.log(`✅ ${this.slaveDataSources.length} Slave DBs connected`);
  }

  // Write operations → Master
  getMasterDataSource(): DataSource {
    return this.masterDataSource;
  }

  // Read operations → Slaves (Round-robin load balancing)
  getSlaveDataSource(): DataSource {
    const slave = this.slaveDataSources[this.currentSlaveIndex];
    this.currentSlaveIndex =
      (this.currentSlaveIndex + 1) % this.slaveDataSources.length;
    return slave;
  }

  // For specific slave selection
  getSlaveByIndex(index: number): DataSource {
    return this.slaveDataSources[index % this.slaveDataSources.length];
  }
}
