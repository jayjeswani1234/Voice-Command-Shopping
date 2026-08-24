const { Kafka } = require('kafkajs');
const { recordPurchase } = require('../services/recommendationService');

const kafka = new Kafka({
  clientId: 'recommendation-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'recommendation-service-group' });

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'purchase.events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const { userId, product } = JSON.parse(message.value.toString());
        await recordPurchase(userId, product);
        console.log(`Recorded purchase and invalidated cache for user ${userId}: ${product}`);
      } catch (err) {
        console.error('Failed to process purchase event:', err);
      }
    },
  });

  console.log('Recommendation service consuming purchase.events');
}

module.exports = { startConsumer };
