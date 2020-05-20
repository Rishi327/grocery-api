const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const Store = require('../models/store');
const Request = require('../models/itemRequest');
const Item = require('../models/item');
const Order = require('../models/order');
const Admin = require('../models/admin');
const logger = require('../lib/logger');
const utils = require('../lib/utils');

const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
const jwtSecret = process.env.JWT_SECRET || 'top_secret';

exports.createUser = async (req, res) => {
    const reqBody = req.body
    try {
        if(!reqBody.email || !reqBody.password){
            return res.status(400).json({
                error: 'INCOMPLETE_FORM',
                status: 'FAIL',
                message: 'Please provide Email & Password both'
            })
        }
        if(await Admin.findOne({email: reqBody.email})){
            return res.status(409).json({
                error: 'DUPLICATE',
                status: 'FAIL',
                message: 'Admin user already exists'
            })
        }
        
        const hashedPassword = await bcrypt.hash(reqBody.password, saltRounds)
        const user = {
            email: reqBody.email.toLowerCase(),
            password: hashedPassword,
            firstName: reqBody.firstName,
            lastName: reqBody.lastName
        }
        const newUser = await Admin.create(user)
        return res.json({
            data: newUser._id,
            status: 'SUCCESS',
            message: 'New Admin user created successfully.'
        })
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API for an Admin to Login
 */
exports.getLoginToken = async (req, res) => {
    const reqBody = req.body
    try {
        const user = await Admin.findOne({email: reqBody.email.toLowerCase()})
        if(!user){
            return res.status(404).json({
                error: 'NO_USER_FOUND',
                status: 'FAIL',
                message: 'Admin does not exist'
            })
        }
        //Not storing the sensitive password, instead picking only the email and id
        const body = { _id : user._id, email : user.email };
        //Sign the JWT token and populate the payload with the user email and id which expires in 1 hour
        const token = jwt.sign({ user : body }, jwtSecret);
        //Send back the token to the user
        return res.json({ 
            token, 
            status: 'SUCCESS',
            message: 'Logged in successfully',
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });

    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to Create a new Store
 */
exports.createStore = async (req, res) => {
    const reqBody = req.body
    try {
        const store = {
            storeName: reqBody.name,
            address: reqBody.address,
            phone: reqBody.phone,
            email: reqBody.email,
            inventory: []
        }
        if(reqBody.image) store.image = reqBody.image
        return res.json({
            data: await Store.create(store),
            status: 'SUCCESS',
            message: 'New Store created'
        })
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to Edit a Store
 */
exports.editStore = async (req, res) => {
    const reqBody = req.body
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const storeObj = {
            storeName: reqBody.name ? reqBody.name : store.storeName,
            address: reqBody.address ? reqBody.address : store.address,
            phone: reqBody.phone ? reqBody.phone : store.phone,
            email: reqBody.email ? reqBody.email : store.email,
            image: reqBody.image ? reqBody.image : store.image
        }
        await Store.findByIdAndUpdate(store._id, storeObj)
        return res.json({
            data: store._id,
            status: 'SUCCESS',
            message: 'Store info Updated'
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to Delete a Store
 */
exports.deleteStore = async (req, res) => {
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        await store.softdelete()
        return res.json({
            data: store._id,
            status: 'SUCCESS',
            message: 'Store Deleted'
        })
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to Create a new Item in Inventory
 */
exports.createItem = async (req, res) => {
    const reqBody = req.body
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        let price = Number(reqBody.price)
        if (isNaN(price)) return res.status(400).json({
            error: 'INVALID_PRICE',
            status: 'FAIL',
            message: 'Price must be a decimal number'
        })
        const item = {
            itemName: reqBody.name,
            price,
            image: reqBody.image,
            storeId: store._id
        }
        if(reqBody.description) item.description = reqBody.description
        if(reqBody.quantity) {
            let quantity = parseInt(reqBody.quantity)
            if (isNaN(quantity)) return res.status(400).json({
                error: 'INVALID_QUANTITY',
                status: 'FAIL',
                message: 'Quantity must be an integer number'
            })
            item.stock = quantity
        }
        const newItem = await Item.create(item)
        await Store.findByIdAndUpdate(store._id, { $push: { inventory: newItem._id} })
        return res.json({
            data: newItem,
            status: 'SUCCESS',
            message: 'New Item added to inventory'
        })
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to Edit an Item
 */
exports.editItem = async (req, res) => {
    const reqBody = req.body
    const storeId = req.params.storeId
    const itemId = req.params.itemId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const item = itemId.match(/^[0-9a-fA-F]{24}$/) ? await Item.findById(itemId) : undefined
        if (!item) return res.status(400).json({
            error: 'INVALID_ITEM',
            status: 'FAIL',
            message: 'Item with given id does not exist'
        })
        const itemObj = {
            itemName: reqBody.name ? reqBody.name : item.itemName,
            price: reqBody.price ? Number(reqBody.price) : item.price,
            image: reqBody.image ? reqBody.image : item.image,
            description: reqBody.description ? reqBody.description : item.description,
            stock: reqBody.quantity ? Number(reqBody.quantity) : item.stock
        }
        await Item.findByIdAndUpdate(item._id, itemObj)
        return res.json({
            data: item._id,
            status: 'SUCCESS',
            message: 'Item info Updated'
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to Delete an Item
 */
exports.deleteItem = async (req, res) => {
    const storeId = req.params.storeId
    const itemId = req.params.itemId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const item = itemId.match(/^[0-9a-fA-F]{24}$/) ? await Item.findById(itemId) : undefined
        if (!item) return res.status(400).json({
            error: 'INVALID_ITEM',
            status: 'FAIL',
            message: 'Item with given id does not exist.'
        })
        await item.softdelete()
        await Store.findByIdAndUpdate(store._id, { $pull: { inventory: item._id} })
        return res.json({
            data: item._id,
            status: 'SUCCESS',
            message: 'Item Deleted'
        })
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to List all Requests for unavailable items in a particular Store
 */
exports.listRequests = async (req, res) => {
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'store with given id does not exist'
        })
        const count = await Request.countDocuments({ storeId: store._id })
        const [limit, page] = [parseInt(req.query.limit) || parseInt(count), parseInt(req.query.page) || 1]
        const requests = await Request.find({ storeId: store._id }, '-storeId -updatedAt -__v')
        .lean().sort({createdAt: -1}).skip(limit * (page - 1)).limit(limit)
        return res.json({
            count,
            data: requests.map(request => ({...request, pickUpTime: moment(request.pickUpTime).local()})),
            status: 'SUCCESS',
            message: requests.length ? 'List of item requests' : 'No requests found',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to List all Orders for a particular Store
 */
exports.listOrders = async (req, res) => {
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const count = await Order.countDocuments({ storeId: store._id })
        const [limit, page] = [parseInt(req.query.limit) || parseInt(count), parseInt(req.query.page) || 1]
        const orders = await Order.find({ storeId: store._id }, '-storeId -updatedAt -__v')
        .lean().sort({createdAt: -1}).skip(limit * (page - 1)).limit(limit)
        return res.json({
            count,
            data: orders.map(order => ({...order, pickUpTime: moment(order.pickUpTime).local(), noOfItems: order.items.length})),
            status: 'SUCCESS',
            message: orders.length ? 'List of orders' : 'No orders found',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}

/**
 * API to get details of an Order
 */
exports.orderDetails = async (req, res) => {
    const storeId = req.params.storeId
    const orderId = req.params.orderId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const order = orderId.match(/^[0-9a-fA-F]{24}$/) 
        ? await Order.findById(orderId).populate('items.item', 'itemName price').lean() 
        : undefined
        if (!order) return res.status(400).json({
            error: 'INVALID_ORDER',
            status: 'FAIL',
            message: 'Order with given id does not exist'
        })
        return res.json({
            data: {...order, pickUpTime: moment(order.pickUpTime).local(), noOfItems: order.items.length},
            status: 'SUCCESS',
            message: 'Order details fetched',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}