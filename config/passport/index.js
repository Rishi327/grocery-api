'use strict';
/*
 * Module dependencies.
 */

const local = require('./local');
const jwt = require('./jwt');
const User = require('../../models/admin');

/**
 * Expose
 */

module.exports = function(passport) {
  // serialize and deserialize sessions
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => User.findOne({ _id: id }, done));

  // use these strategies
  passport.use('localAdmin', local.adminStrategy);
  passport.use('jwt', jwt);
};
