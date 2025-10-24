// src/queue/rabbitmq/order-consumer.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from './rabbitmq.service.js';
import { ConsumeMessage } from 'amqplib';
import { Order, OrderStatus } from '../entities/order.entity.js';

@Injectable()
export class OrderConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OrderConsumerService.name);

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async onModuleInit() {
    // Wait for RabbitMQ infrastructure setup
    await this.rabbitMQ.waitForSetup();

    const config = this.rabbitMQ.getConfig();
    await this.rabbitMQ.consume(
      config.queues.ORDER_PROCESSING,
      (msg: ConsumeMessage) => this.processOrder(msg),
    );
    this.logger.log('🎧 Consumer listening...');
  }

  private async processOrder(msg: ConsumeMessage) {
    const data = JSON.parse(msg.content.toString());
    const { orderId, items } = data;

    this.logger.log(`🔄 Processing order ${orderId}`);

    try {
      // Update status to PROCESSING
      await this.orderRepository.update(orderId, {
        status: OrderStatus.PROCESSING,
        processedAt: new Date(),
      });

      // Fast processing for load testing
      await this.sleep(50); // Validate (50ms instead of 500ms)
      if (!items || items.length === 0) {
        throw new Error('No items in order');
      }

      await this.sleep(100); // Check inventory (100ms instead of 1s)
      if (Math.random() < 0.001) {
        // Reduce failure rate to 0.1%
        throw new Error('Out of stock');
      }

      await this.sleep(200); // Process payment (200ms instead of 2s)
      if (Math.random() < 0.001) {
        // 0.1% fail rate
        throw new Error('Payment failed');
      }

      await this.sleep(50); // Update inventory (50ms instead of 800ms)
      await this.sleep(100); // Send notification (100ms instead of 1.5s)

      // Mark as COMPLETED
      await this.orderRepository.update(orderId, {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      });

      // Total: ~500ms per order (instead of 6s)
      this.logger.log(`✅ Order ${orderId} completed`);
    } catch (error) {
      this.logger.error(`❌ Order ${orderId} failed: ${error.message}`);

      // Update status to FAILED
      await this.orderRepository.update(orderId, {
        status: OrderStatus.FAILED,
        errorMessage: error.message,
        retryCount: () => 'retry_count + 1',
      });

      throw error;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
