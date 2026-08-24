const { Kafka } = require('kafkajs');
const ShoppingItem = require('../models/ShoppingItem');
const { publishShoppingEvent, publishPurchaseEvent } = require('./producer');

const kafka = new Kafka({
  clientId: 'shopping-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'shopping-service-group' });

async function handleCommand(command) {
  const { event, userId, item } = command;

  switch (event) {
    case 'SHOPPING_ITEM_ADD': {
      const doc = await ShoppingItem.create({
        userId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      });
      await publishShoppingEvent({ event: 'SHOPPING_ITEM_ADDED', userId, item: doc });
      break;
    }
    case 'SHOPPING_ITEM_REMOVE': {
      const doc = await ShoppingItem.findOneAndDelete({ userId, name: item.name });
      await publishShoppingEvent({ event: 'SHOPPING_ITEM_REMOVED', userId, item: doc || item });
      break;
    }
    case 'SHOPPING_ITEM_COMPLETE': {
      const doc = await ShoppingItem.findOneAndUpdate(
        { userId, name: item.name },
        { purchased: true },
        { new: true }
      );
      if (doc) {
        await publishShoppingEvent({ event: 'SHOPPING_ITEM_PURCHASED', userId, item: doc });
        await publishPurchaseEvent({ event: 'ITEM_PURCHASED', userId, product: doc.name });
      }
      break;
    }
    default:
      console.warn('Unhandled command event:', event);
  }
}

async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'shopping.commands', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const command = JSON.parse(message.value.toString());
        await handleCommand(command);
      } catch (err) {
        console.error('Failed to process shopping command:', err);
      }
    },
  });

  console.log('Shopping service consuming shopping.commands');
}

module.exports = { startConsumer };
