"use strict";
const moment = require('moment');

module.exports = {

	/**
	 * Log messages to console
	 * @param {string} args pass multiple messages 
	 */
	log : function (...args) {
		args.unshift(moment().toISOString() + ': ');
		console.log.apply(console,args);
    },

	/**
	 * Log information to console
	 * @param {string} args pass multiple messages
	 */
	info : function (...args) {
		args.unshift(moment().toISOString() + ': ');
		console.info.apply(console,args);
    },
	
	/**
	 * Log error messages to console
	 * @param {string} args pass multiple error messages
	 */
	error : function (...args) {
        args.unshift(moment().toISOString() + ': ');
        console.log('\x1b[31m','--------------------------------------------------------------');        
        console.error.apply(console,args);
		console.log('--------------------------------------------------------------', "\x1b[0m");
	}
}