import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { QueueModule } from './queue/rabbitmq/queue.module.js';
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    QueueModule,
    // ... other modules
  ],
})
export class AppModule {}
