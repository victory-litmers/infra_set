import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service.js';
import { v7 as uuidv7 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from '../entities/order.entity.js';
import { Repository } from 'typeorm';

@Injectable()
export class OrderProducerService {
  private readonly logger = new Logger(OrderProducerService.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async publishOrder(orderData: any) {
    const orderId = uuidv7();

    const order = this.orderRepository.create({
      id: orderId,
      userId: orderData.userId,
      items: orderData.items,
      total: orderData.total,
      status: OrderStatus.PENDING,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      notes: orderData.notes,
    });

    await this.orderRepository.save(order);
    this.logger.log(`💾 Order ${order.id} saved to DB`);

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
