'use strict';
/**
 * Module dependencies.
 */
const shopper = require('../controllers/shopper');
const admin = require('../controllers/admin');
const mail = require('../lib/mailer');
const logger = require('../lib/logger');

const [webRoute, adminRoute, storePath] = ['/web', '/admin', '/stores/:storeId'];


/**
 * Expose
 */
module.exports = function(app, passport) {
  
   
  const jwtAuth = passport.authenticate('jwt');
  
  // Server status check Route
  app.get('/', (req, res) => {
    return res.send('Server Running')
  });
  
  // Shopper APIs
  app.get(`${webRoute}/stores`, shopper.listAllStores);
  app.get(`${webRoute}${storePath}`, shopper.getStoreDetails);
  app.get(`${webRoute}${storePath}/items`, shopper.viewStoreInventory);
  app.get(`${webRoute}${storePath}/items/:itemId`, shopper.viewItemDetails);
  app.post(`${webRoute}${storePath}/orders`, shopper.placeOrder);
  app.post(`${webRoute}${storePath}/requests`, shopper.requestNewItem);
  
  // Admin APIs
  app.post(`${adminRoute}/create`, admin.createUser); // create Admin
  app.post(`${adminRoute}/login`, passport.authenticate('localAdmin', {session: false, failureMessage: true}), admin.getLoginToken);
  app.get(`${adminRoute}/stores`, jwtAuth, shopper.listAllStores);
  app.post(`${adminRoute}/stores`, jwtAuth, admin.createStore);
  app.put(`${adminRoute}${storePath}`, jwtAuth, admin.editStore);
  app.delete(`${adminRoute}${storePath}`, jwtAuth, admin.deleteStore);
  app.get(`${adminRoute}${storePath}/items`, jwtAuth, shopper.viewStoreInventory);
  app.post(`${adminRoute}${storePath}/items`, jwtAuth, admin.createItem);
  app.put(`${adminRoute}${storePath}/items/:itemId`, jwtAuth, admin.editItem);
  app.delete(`${adminRoute}${storePath}/items/:itemId`, jwtAuth, admin.deleteItem);
  app.get(`${adminRoute}${storePath}/requests`, jwtAuth, admin.listRequests);
  app.get(`${adminRoute}${storePath}/orders`, jwtAuth, admin.listOrders);
  app.get(`${adminRoute}${storePath}/orders/:orderId`, jwtAuth, admin.orderDetails);


  app.post('/test/mailer', async (req, res) => {
    let userEmail = req.body.userEmail,
        subject = req.body.subject,
        message = req.body.message;
        
    let mailBody = {
      message,
      template: `<div>Testing the mail service. Ignore it.<ul><li><b>Subject is:</b> ${subject}</li><li>${message}</li></ul></div>`
    }
    try {
      const result = await mail(userEmail, subject, 'Tester Mail. Ignore this.')
      return res.json(result);
    } catch (error) {
      return res.json(error)
    } 
  })

  /**
   * Error handling
   */
  app.use(function(err, req, res, next) {
    // treat as 404
    if (
      err.message &&
      (~err.message.indexOf('not found') ||
        ~err.message.indexOf('Cast to ObjectId failed'))
    ) {
      return next();
    }
    logger.error(err.stack);
    res.status(401).json({
      error: err.message || JSON.stringify(err)
    })
  });

  // assume 404 since no middleware responded
  app.use(function(req, res) {
    res.status(404).json({
      url: req.originalUrl,
      error: 'Not found'
    })
  });
};
