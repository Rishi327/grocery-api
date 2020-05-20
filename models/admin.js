/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Admin schema
 */

const AdminSchema = new Schema({
    role: { type: String, default: 'admin' },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: String,
    firstName: String,
    lastName: String
});

module.exports = mongoose.model('Admin', AdminSchema);