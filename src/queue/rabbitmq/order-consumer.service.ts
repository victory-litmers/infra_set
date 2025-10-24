// src/queue/rabbitmq/order-consumer.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class OrderConsumerService implements OnModuleInit {
  private readonly logger = new Logger(OrderConsumerService.name);

  constructor(private readonly rabbitMQ: RabbitMQService) {}

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
      // Step 1: Validate
      await this.sleep(50);
      if (!items || items.length === 0) {
        throw new Error('No items in order');
      }

      // Step 2: Check inventory
      await this.sleep(100);
      if (Math.random() < 0.1) {
        // 10% fail rate for testing
        throw new Error('Out of stock');
      }

      // Step 3: Process payment
      await this.sleep(200);
      if (Math.random() < 0.05) {
        // 5% fail rate
        throw new Error('Payment failed');
      }

      // Step 4: Update inventory
      await this.sleep(50);

      // Step 5: Send notification
      await this.sleep(100);

      this.logger.log(`✅ Order ${orderId} completed`);
    } catch (error) {
      this.logger.error(`❌ Order ${orderId} failed: ${error.message}`);
      throw error; // Will be caught by RabbitMQ consumer -> NACK -> DLQ
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
