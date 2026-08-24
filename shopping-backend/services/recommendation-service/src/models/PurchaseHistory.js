const mongoose = require('mongoose');

// This service owns a small store of its own -- purchase frequency per
// user/product -- rather than reaching into the shopping service's database.
const purchaseHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    product: { type: String, required: true },
    count: { type: Number, default: 1 },
  },
  { timestamps: true }
);

purchaseHistorySchema.index({ userId: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('PurchaseHistory', purchaseHistorySchema);
