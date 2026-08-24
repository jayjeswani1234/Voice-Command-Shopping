const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'shopping-service-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

async function publishShoppingEvent(event) {
  await connectProducer();
  await producer.send({
    topic: 'shopping.events',
    messages: [{ key: event.userId, value: JSON.stringify(event) }],
  });
}

// Fired only when an item is marked purchased -- this is what the
// recommendation service listens for to invalidate its Redis cache.
async function publishPurchaseEvent(event) {
  await connectProducer();
  await producer.send({
    topic: 'purchase.events',
    messages: [{ key: event.userId, value: JSON.stringify(event) }],
  });
}

module.exports = { connectProducer, publishShoppingEvent, publishPurchaseEvent };
