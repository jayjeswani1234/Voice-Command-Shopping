require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { search, getById } = require('./controllers/productController');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

app.get('/api/products/search', search);
app.get('/api/products/:id', getById);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));

async function start() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/products');
  console.log('Product service connected to MongoDB');
  app.listen(PORT, () => console.log(`Product service listening on ${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start product service:', err);
  process.exit(1);
});
