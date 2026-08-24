const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'command-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  if (!connected) {
    await producer.connect();
    connected = true;
    console.log('Command service connected to Kafka');
  }
}

async function publishShoppingCommand(event) {
  await connectProducer();
  await producer.send({
    topic: 'shopping.commands',
    messages: [{ key: event.userId, value: JSON.stringify(event) }],
  });
}

module.exports = { connectProducer, publishShoppingCommand };
