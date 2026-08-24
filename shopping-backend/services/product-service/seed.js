// Seeds a handful of sample products so /api/products/search returns
// something out of the box. Run with: docker compose exec product-service node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

const sample = [
  { name: 'Whole milk', brand: 'Dairy Farm', category: 'dairy', price: 3.49 },
  { name: 'Almond milk', brand: 'NutPod', category: 'dairy', price: 4.99 },
  { name: 'Sourdough bread', brand: 'Baker St', category: 'bakery', price: 5.25 },
  { name: 'Bananas', brand: null, category: 'produce', price: 0.59 },
  { name: 'Free-range eggs', brand: 'Happy Hen', category: 'dairy', price: 6.1 },
];

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/products')
  .then(async () => {
    await Product.deleteMany({});
    await Product.insertMany(sample);
    console.log(`Seeded ${sample.length} products`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
