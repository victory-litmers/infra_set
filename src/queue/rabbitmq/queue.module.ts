// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import { OrderController } from './order.controller.js';
import { OrderProducerService } from './order-producer.service.js';
import { OrderConsumerService } from './order-consumer.service.js';
import { Order } from '../entities/order.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController],
  providers: [RabbitMQService, OrderProducerService, OrderConsumerService],
  exports: [RabbitMQService],
})
export class QueueModule {}
