import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { QueueModule } from './queue/rabbitmq/queue.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './queue/entities/order.entity.js';
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    QueueModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5440,
      username: 'postgres',
      password: 'postgres',
      database: 'main_db',
      entities: [Order],
      synchronize: false,
    }),
    // ... other modules
  ],
})
export class AppModule {}
