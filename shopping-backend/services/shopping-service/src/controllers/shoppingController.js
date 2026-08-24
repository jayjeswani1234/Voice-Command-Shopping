const ShoppingItem = require('../models/ShoppingItem');

async function getList(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const items = await ShoppingItem.find({ userId }).sort({ createdAt: -1 });
  res.json(items);
}

async function addItem(req, res) {
  const { userId, name, quantity = 1, unit = null } = req.body;
  if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });

  const item = await ShoppingItem.create({ userId, name, quantity, unit });
  res.status(201).json(item);
}

async function updateItem(req, res) {
  const { id } = req.params;
  const item = await ShoppingItem.findByIdAndUpdate(id, req.body, { new: true });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
}

async function deleteItem(req, res) {
  const { id } = req.params;
  const item = await ShoppingItem.findByIdAndDelete(id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ deleted: true });
}

module.exports = { getList, addItem, updateItem, deleteItem };
