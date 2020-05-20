/**
 * Module dependencies.
 */

const bcrypt = require('bcrypt');
const LocalStrategy = require('passport-local').Strategy;
const Admin = require('../../models/admin');

/**
 * Expose
 */

module.exports = {
  // Local strategy to authenticate an Admin
  adminStrategy: new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        email = email.toLowerCase()
        const user = await Admin.findOne({ email })
        if (!user) {
          return done(null, false, { message: 'Incorrect Email' });
        }
        if (!await bcrypt.compare(password, user.password)) {
          return done(null, false, { message: 'Incorrect password' });
        }
        return done(null, user, { message: 'Logged In Successfully' });
      } catch (error) {
        console.error(error);  
        return done(error);
      }
    }
  )
};
