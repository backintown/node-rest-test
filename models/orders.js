const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  createdBy: { type: String }
});

module.exports = mongoose.model('Order', orderSchema);