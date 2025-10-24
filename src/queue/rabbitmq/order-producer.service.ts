import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class OrderProducerService {
  private readonly logger = new Logger(OrderProducerService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async publishOrder(orderData: any) {
    const orderId = uuidv7();
    const config = this.rabbitMQService.getConfig();

    await this.rabbitMQService.publish(
      config.exchanges.ORDER,
      config.routingKeys.ORDER_CREATED,
      { orderId, ...orderData, createdAt: new Date().toISOString() },
    );

    this.logger.log(`✅ Order ${orderId} published`);

    return { orderId };
  }
}
