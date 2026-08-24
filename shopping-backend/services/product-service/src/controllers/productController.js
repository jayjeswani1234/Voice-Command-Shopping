const Product = require('../models/Product');

async function search(req, res) {
  const { q, category, maxPrice } = req.query;
  const filter = {};

  if (q) filter.name = { $regex: q, $options: 'i' };
  if (category) filter.category = category;
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };

  const products = await Product.find(filter).limit(50);
  res.json(products);
}

async function getById(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
}

module.exports = { search, getById };
