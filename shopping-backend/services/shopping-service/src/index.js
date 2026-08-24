require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { startConsumer } = require('./kafka/consumer');
const { getList, addItem, updateItem, deleteItem } = require('./controllers/shoppingController');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// This service owns the shopping list -- it is the only service allowed to
// write to the shopping collection, whether the write comes from a direct
// REST call or from a Kafka command.
app.get('/api/shopping', getList);
app.post('/api/shopping', addItem);
app.patch('/api/shopping/:id', updateItem);
app.delete('/api/shopping/:id', deleteItem);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'shopping-service' }));

async function start() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/shopping');
  console.log('Shopping service connected to MongoDB');

  await startConsumer();

  app.listen(PORT, () => console.log(`Shopping service listening on ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start shopping service:', err);
  process.exit(1);
});
