"use strict";

const handler = (promise) => {

	return promise
		.then(data => {
			return {e: null, d:data};
		})
		.catch(err => {
			return {e:err, d: null};
		});
};

module.exports = handler;