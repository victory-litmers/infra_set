// src/queue/rabbitmq/order.controller.ts
import { Controller, Post, Body, Get } from '@nestjs/common';
import { OrderProducerService } from './order-producer.service.js';

@Controller('orders')
export class OrderController {
  constructor(private readonly producer: OrderProducerService) {}

  @Post()
  async createOrder(@Body() dto: any) {
    const startTime = Date.now();
    const result = await this.producer.publishOrder(dto);
    const responseTime = Date.now() - startTime;

    return {
      orderId: result.orderId,
      status: 'pending',
      message: 'Order is being processed',
      responseTime: `${responseTime}ms`,
    };
  }

  @Get('stats')
  getStats() {
    return {
      message: 'Check RabbitMQ UI for queue stats',
      url: 'http://localhost:15672',
      queues: {
        processing: 'order.processing',
        failed: 'order.failed (DLQ)',
      },
    };
  }
}
