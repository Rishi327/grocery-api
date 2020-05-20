/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Request schema
 */

const RequestSchema = new Schema({
    itemName: { type: String, required: true },
    storeId: { type: Schema.Types.ObjectId, required: true },
    pickUpTime: { type: Date, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerEmail: String
}, { timestamps: true });

module.exports = mongoose.model('Request', RequestSchema, 'users');