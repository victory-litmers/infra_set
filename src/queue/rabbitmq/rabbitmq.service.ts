// src/queue/rabbitmq/rabbitmq.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private setupComplete = false;

  private readonly config = {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchanges: { ORDER: 'order.exchange', DLX: 'dlx' },
    queues: {
      ORDER_PROCESSING: 'order.processing',
      ORDER_FAILED: 'order.failed',
    },
    routingKeys: { ORDER_CREATED: 'order.created' },
  };

  async onModuleInit() {
    this.connection = amqp.connect([this.config.url]);
    this.connection.on('connect', () =>
      this.logger.log('✅ RabbitMQ connected'),
    );

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(10);

        // Create exchanges
        await channel.assertExchange(this.config.exchanges.ORDER, 'direct', {
          durable: true,
        });
        await channel.assertExchange(this.config.exchanges.DLX, 'fanout', {
          durable: true,
        });

        // Create queues
        await channel.assertQueue(this.config.queues.ORDER_PROCESSING, {
          durable: true,
          arguments: { deadLetterExchange: this.config.exchanges.DLX },
        });
        await channel.assertQueue(this.config.queues.ORDER_FAILED, {
          durable: true,
        });

        // Create bindings
        await channel.bindQueue(
          this.config.queues.ORDER_PROCESSING,
          this.config.exchanges.ORDER,
          this.config.routingKeys.ORDER_CREATED,
        );
        await channel.bindQueue(
          this.config.queues.ORDER_FAILED,
          this.config.exchanges.DLX,
          '',
        );

        this.setupComplete = true;
        this.logger.log('🏗️ Infrastructure setup complete');
        return channel;
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('📺 Channel ready');
  }

  async waitForSetup() {
    while (!this.setupComplete) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async publish(exchange: string, routingKey: string, message: any) {
    await this.channelWrapper.publish(exchange, routingKey, message, {
      persistent: true,
    });
  }

  async consume(
    queue: string,
    handler: (msg: ConsumeMessage) => Promise<void>,
  ) {
    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      await channel.consume(
        queue,
        async (msg) => {
          if (!msg) return;

          const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
          const maxRetries = 3;

          try {
            await handler(msg);
            channel.ack(msg);
            this.logger.debug(`✅ ACK message`);
          } catch (error) {
            this.logger.error(
              `❌ Error (attempt ${retryCount + 1}/${maxRetries}): ${error.message}`,
            );

            if (retryCount < maxRetries) {
              // Retry with delay and increment count
              const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s

              this.logger.log(`🔄 Retrying in ${delay}ms...`);

              // Requeue with updated retry count
              setTimeout(() => {
                channel.publish('', queue, msg.content, {
                  ...msg.properties,
                  headers: {
                    ...msg.properties.headers,
                    'x-retry-count': retryCount + 1,
                  },
                });
                channel.ack(msg); // Remove original message
              }, delay);
            } else {
              // Max retries reached -> DLQ
              this.logger.error(`🚨 Max retries reached -> DLQ`);
              channel.nack(msg, false, false); // No requeue -> DLQ
            }
          }
        },
        { noAck: false },
      );
    });
  }

  async onModuleDestroy() {
    await this.channelWrapper?.close();
    await this.connection?.close();
  }

  getConfig() {
    return this.config;
  }
}
