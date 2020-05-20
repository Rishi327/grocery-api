const moment = require('moment');

const Store = require('../models/store');
const Request = require('../models/itemRequest');
const Item = require('../models/item');
const Order = require('../models/order');
const logger = require('../lib/logger');
const utils = require('../lib/utils');
const mail = require('../lib/mailer');

const adminEmail = process.env.ADMIN_EMAIL || 'testadmin@yopmail.com'

/**
 * API to List all Stores
 */
exports.listAllStores = async (req, res) => {
    try {
        const count = await Store.countDocuments({ deleted: false })
        const [limit, page] = [parseInt(req.query.limit) || parseInt(count), parseInt(req.query.page) || 1]
        const stores = await Store.find({ deleted: false }).select('-inventory -createdAt -updatedAt -__v').skip(limit * (page - 1)).limit(limit)
        return res.json({
            count,
            data: stores,
            status: 'SUCCESS',
            message: stores.length ? 'List of all Stores' : 'No stores found',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to get the Details of a Store
 */
exports.getStoreDetails = async (req, res) => {
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) 
        ? await Store.findById(storeId).populate('inventory', 'itemName price stock description image') 
        : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        return res.json({
            data: store,
            status: 'SUCCESS',
            message: 'Store Details fetched',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to get the Inventory / Item List of a Store
 */
exports.viewStoreInventory = async (req, res) => {
    const storeId = req.params.storeId
    try {
        const count = await Item.countDocuments({ storeId, deleted: false })
        const [limit, page] = [parseInt(req.query.limit) || parseInt(count), parseInt(req.query.page) || 1]
        const inventory = storeId.match(/^[0-9a-fA-F]{24}$/) 
        ? await Item.find({ storeId, deleted: false }, '-createdAt -updatedAt -__v').populate('storeId', 'storeName').skip(limit * (page - 1)).limit(limit) 
        : undefined
        if (!inventory) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        return res.json({
            count,
            data: inventory,
            status: 'SUCCESS',
            message: inventory.length ? 'Inventory items list fetched' : 'No items found in Inventory',
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to get the Details of an Item
 */
exports.viewItemDetails = async (req, res) => {
    const storeId = req.params.storeId
    const itemId = req.params.itemId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const item = itemId.match(/^[0-9a-fA-F]{24}$/) 
        ? await Item.findById(itemId).populate('storeId', '-inventory -createdAt -updatedAt -__v') 
        : undefined
        if (!item) return res.status(400).json({
            error: 'INVALID_ITEM',
            status: 'FAIL',
            message: 'Item with given id does not exist.'
        })
        return res.json({
            data: item,
            status: 'SUCCESS',
            message: 'Item details fetched'
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to Place an Order
 */
exports.placeOrder = async (req, res) => {
    const reqBody = req.body
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        if (!reqBody.items.length) {
            return res.status(400).json({
                error: 'EMPTY_CART',
                status: 'FAIL',
                message: 'Cart is Empty. Please add one or more items to the cart'
            })
        }
        // Check the quantity if available in stock
        const items = JSON.parse(reqBody.items)
        for (const item of items) {
            const itemObj = await Item.findById(item.item)
            if (item.quantity > itemObj.stock) {
                return res.status(400).json({
                    error: 'OUT_OF_STOCK',
                    status: 'FAIL',
                    message: 'One or more item(s) in the cart is not available as the quantity selected. Please remove the item or decrease the quantity'
                })
            }
        }
        const pickUp = new Date( Number(reqBody.pickUp) * 1000 )
        const order = {
            orderNo: utils.generateOrderId(),
            storeId: store._id,
            items,
            pickUpTime: pickUp,
            customerName: reqBody.name,
            customerPhone: reqBody.phone,
            totalAmount: reqBody.amount
        }
        if(reqBody.email) order.customerEmail = reqBody.email
        const newOrder = await Order.create(order)
        await Order.populate(newOrder, {path: 'items.item', select: 'itemName price'})

        // Mail the Admin & the Store about order placing confirmation
        let orderItems = ''
        for (const item of newOrder.items) {
            // Decrease stock quantity of the item
            await Item.findByIdAndUpdate(item.item._id, { $inc: { stock: -item.quantity } })
            // Prepare dynamic list for mail content
            orderItems += `<tr>
            <td align="center" style="padding: 2px 0 0 0;">${item.item.itemName}</td>
            <td align="center" style="padding: 2px 0 0 0;">${item.quantity}</td>
            <td align="center" style="padding: 2px 0 0 0;">$${item.item.price} x ${item.quantity} = $${item.item.price * item.quantity}</td>
            </tr>`
        }
        const formattedDateTime = {
            date: moment(newOrder.pickUpTime.getTime()).local().format('MMMM Do YYYY'),
            time: moment(newOrder.pickUpTime.getTime()).local().format('h:mm:ss a')
        }
        const mailContent = {
            storeName: store.storeName,
            customerName: newOrder.customerName,
            orderNo: newOrder.orderNo,
            total: newOrder.totalAmount,
            pickDate: formattedDateTime.date,
            pickTime: formattedDateTime.time,
            orderItems
        }

        res.json({
            data: newOrder,
            status: 'SUCCESS',
            message: `Order #${newOrder.orderNo} placed successfully.`
        })
        const mailPool = [
            // Mail the Admin
            mail(adminEmail, 'New Order Notification', utils.customTemplate('admin', mailContent)),
            // Mail the Store
            mail(store.email, 'New Order Placed', utils.customTemplate('store', mailContent))
        ]
        // Mail the Customer only if email id is provided
        if(newOrder.customerEmail) mailPool.push(mail(newOrder.customerEmail, 'Your Order Placed Successfully', utils.customTemplate('customer', mailContent)))
    } catch (error) {
        logger.log(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
/**
 * API to Request a new Item
 */
exports.requestNewItem = async (req, res) => {
    const reqBody = req.body
    const storeId = req.params.storeId
    try {
        const store = storeId.match(/^[0-9a-fA-F]{24}$/) ? await Store.findById(storeId) : undefined
        if (!store) return res.status(400).json({
            error: 'INVALID_STORE',
            status: 'FAIL',
            message: 'Store with given id does not exist'
        })
        const pickUp = new Date( Number(reqBody.pickUp) * 1000 )
        const requestedItem = {
            itemName: reqBody.item,
            storeId: store._id,
            pickUpTime: pickUp,
            customerName: reqBody.name,
            customerPhone: reqBody.phone
        }
        if(reqBody.email) requestedItem.customerEmail = reqBody.email 
        return res.json({
            data: await Request.create(requestedItem),
            status: 'SUCCESS',
            message: 'Item Request successful'
        })
    } catch (error) {
        logger.error(error)
        return res.status(500).json(utils.serverErrorMsg(error))
    }
}
