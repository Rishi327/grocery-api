/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const softDelete = require('mongoose-softdelete');
const Schema = mongoose.Schema;

/**
 * Store schema
 */

const StoreSchema = new Schema({
    storeName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    image: String,
    inventory: [{ type: Schema.Types.ObjectId, ref: 'Item' }]
}, { timestamps: true });

StoreSchema.plugin(softDelete);

module.exports = mongoose.model('Store', StoreSchema);