/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Order schema
 */

const OrderSchema = new Schema({
    orderNo: { type: String, required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    items: [{
        item: { type: Schema.Types.ObjectId, ref: 'Item'},
        quantity: { type: Number, default: 1 }
    }],
    pickUpTime: { type: Date, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: String,
    status: { type: String, enum: ['pending', 'cancelled', 'processing', 'ready_for_pickup', 'complete'] },
    totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema, 'orders');