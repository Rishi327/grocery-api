/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const softDelete = require('mongoose-softdelete');
const Schema = mongoose.Schema;

/**
 * Item schema
 */

const ItemSchema = new Schema({
    itemName: { type: String, required: true },
    category: {type: String },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    description: String,
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    stock: { type: Number, min: 0 }
}, { timestamps: true });

ItemSchema.plugin(softDelete);

module.exports = mongoose.model('Item', ItemSchema);