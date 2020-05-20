/**
 * Module dependencies.
 */
const passportJWT = require("passport-jwt");
const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

const AdminModel = require('../../models/admin');

const jwtSecret = process.env.JWT_SECRET || 'top_secret';
/**
 * Expose
 */

module.exports = new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey   : jwtSecret
    }, async (jwtPayload, cb) => {
        try {
            // Check user validity
            const user = await AdminModel.findById(jwtPayload.user._id)
            if(!user) return cb(null, false)
            return cb(null, user)
        } catch (error) {
            console.error(error);
            return cb(error)
        } 
    })
