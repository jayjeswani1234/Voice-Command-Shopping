const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: null },
    purchased: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShoppingItem', shoppingItemSchema);
