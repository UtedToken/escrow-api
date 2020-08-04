import Joi from 'joi'
const createSchema = {
	method: Joi.string().required(),
	data: Joi.object().required(),
}
const create = {
	security: false,
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { method, data } = input
		const gateway = await this.service('gateway').get({
			id: method.toUpperCase(),
		})
		try {
			const fn = require('../../utils/payment/' + method.toLowerCase())
			await fn(data, gateway)
		} catch (e) {
			//console.log(e);
			throw 'Payment Gateway Not Supported'
		}
	},
}
module.exports = {
	security: {
		role: 'admin',
	},
	create,
}
