import Joi from 'joi'

const createSchema = {
	key: Joi.string().required(),
	apiKey: Joi.string().optional().allow('', null),
	apiSecret: Joi.string().optional().allow('', null),
	logo: Joi.string().optional().allow('', null),
	additionalData: Joi.string().optional().allow('', null),
}
const updateSchema = {
	apiKey: Joi.string().optional().allow('', null),
	apiSecret: Joi.string().optional().allow('', null),
	logo: Joi.string().optional().allow('', null),
	additionalData: Joi.string().optional().allow('', null),
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { key } = input
		let isExist = false
		try {
			await this.service('gateway').get({
				id: key,
			})
			isExist = true
		} catch (e) {}
		if (isExist) {
			throw {
				status: 404,
				message: 'Service Already Exist',
			}
		}
	},
}
const update = {
	validateSchema: updateSchema,
}
module.exports = {
	security: {
		role: 'admin',
	},
	create,
	update,
}
