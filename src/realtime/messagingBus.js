import { randomUUID } from 'node:crypto';

const DEFAULT_REDIS_CHANNEL = 'ludox:realtime:broadcast';
const DEFAULT_KAFKA_CLIENT_ID = 'ludox-backend';
const DEFAULT_KAFKA_TOPIC = 'ludox.events';

function parseKafkaBrokers(rawValue) {
  if (!rawValue) return [];
  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function createNoopBus(serverId) {
  return {
    serverId,
    publishBroadcast() {},
    publishDomainEvent() {},
    async close() {}
  };
}

class RealtimeMessagingBus {
  constructor({
    serverId,
    logger,
    redisUrl,
    redisChannel,
    kafkaBrokers,
    kafkaClientId,
    kafkaTopic,
    onBroadcast
  }) {
    this.serverId = serverId;
    this.logger = logger;
    this.redisUrl = redisUrl;
    this.redisChannel = redisChannel;
    this.kafkaBrokers = kafkaBrokers;
    this.kafkaClientId = kafkaClientId;
    this.kafkaTopic = kafkaTopic;
    this.onBroadcast = onBroadcast;
    this.redisPublisher = null;
    this.redisSubscriber = null;
    this.kafkaProducer = null;
  }

  async init() {
    await Promise.all([this.initRedis(), this.initKafka()]);
  }

  async initRedis() {
    if (!this.redisUrl) {
      return;
    }

    try {
      const { createClient } = await import('redis');
      this.redisPublisher = createClient({ url: this.redisUrl });
      this.redisSubscriber = createClient({ url: this.redisUrl });

      this.redisPublisher.on('error', (error) => {
        this.logger.warn('Redis publisher error:', error.message);
      });
      this.redisSubscriber.on('error', (error) => {
        this.logger.warn('Redis subscriber error:', error.message);
      });

      await this.redisPublisher.connect();
      await this.redisSubscriber.connect();

      await this.redisSubscriber.subscribe(this.redisChannel, (rawMessage) => {
        this.handleRedisMessage(rawMessage);
      });

      this.logger.info(`Redis pub/sub enabled on channel ${this.redisChannel}`);
    } catch (error) {
      this.redisPublisher = null;
      this.redisSubscriber = null;
      this.logger.warn('Redis integration disabled:', error.message);
    }
  }

  async initKafka() {
    if (this.kafkaBrokers.length === 0) {
      return;
    }

    try {
      const { Kafka, logLevel } = await import('kafkajs');
      const kafka = new Kafka({
        clientId: this.kafkaClientId,
        brokers: this.kafkaBrokers,
        logLevel: logLevel.ERROR
      });

      this.kafkaProducer = kafka.producer();
      await this.kafkaProducer.connect();
      this.logger.info(`Kafka producer enabled for topic ${this.kafkaTopic}`);
    } catch (error) {
      this.kafkaProducer = null;
      this.logger.warn('Kafka integration disabled:', error.message);
    }
  }

  handleRedisMessage(rawMessage) {
    try {
      const message = JSON.parse(rawMessage);
      if (!message || message.originServerId === this.serverId) {
        return;
      }
      if (message.kind === 'socket:broadcast') {
        this.onBroadcast?.(message);
      }
    } catch (error) {
      this.logger.warn('Invalid Redis message ignored:', error.message);
    }
  }

  publishBroadcast(roomId, eventName, payload) {
    const message = {
      kind: 'socket:broadcast',
      originServerId: this.serverId,
      roomId,
      eventName,
      payload,
      timestamp: new Date().toISOString()
    };

    if (this.redisPublisher) {
      void this.redisPublisher.publish(this.redisChannel, JSON.stringify(message)).catch((error) => {
        this.logger.warn('Failed to publish Redis broadcast:', error.message);
      });
    }

    this.publishKafkaEvent('socket.broadcast', message);
  }

  publishDomainEvent(eventType, payload) {
    const message = {
      kind: 'domain:event',
      originServerId: this.serverId,
      eventType,
      payload,
      timestamp: new Date().toISOString()
    };
    this.publishKafkaEvent(eventType, message);
  }

  publishKafkaEvent(key, message) {
    if (!this.kafkaProducer) {
      return;
    }

    void this.kafkaProducer
      .send({
        topic: this.kafkaTopic,
        messages: [{ key, value: JSON.stringify(message) }]
      })
      .catch((error) => {
        this.logger.warn('Failed to publish Kafka event:', error.message);
      });
  }

  async close() {
    await Promise.all([
      this.redisSubscriber?.quit().catch(() => {}),
      this.redisPublisher?.quit().catch(() => {}),
      this.kafkaProducer?.disconnect().catch(() => {})
    ]);
  }
}

export function createMessagingBus({ onBroadcast, logger = console } = {}) {
  const serverId = randomUUID();
  const redisUrl = process.env.REDIS_URL?.trim() || '';
  const redisChannel = process.env.REDIS_CHANNEL?.trim() || DEFAULT_REDIS_CHANNEL;
  const kafkaBrokers = parseKafkaBrokers(process.env.KAFKA_BROKERS);
  const kafkaClientId = process.env.KAFKA_CLIENT_ID?.trim() || DEFAULT_KAFKA_CLIENT_ID;
  const kafkaTopic = process.env.KAFKA_TOPIC?.trim() || DEFAULT_KAFKA_TOPIC;

  if (!redisUrl && kafkaBrokers.length === 0) {
    return createNoopBus(serverId);
  }

  const bus = new RealtimeMessagingBus({
    serverId,
    logger,
    redisUrl,
    redisChannel,
    kafkaBrokers,
    kafkaClientId,
    kafkaTopic,
    onBroadcast
  });

  void bus.init();
  return bus;
}
