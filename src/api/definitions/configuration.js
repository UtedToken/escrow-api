const Joi = require('joi')
const types = ['file', 'text', 'html']
const createSchema = {
	key: Joi.string().required(),
	type: Joi.valid.apply(Joi, types).required(),
	value: Joi.alternatives(Joi.string().required(), Joi.object().required()),
	description: Joi.string().required(),
}
const updateSchema = {
	value: Joi.string().optional(),
	description: Joi.string().optional(),
}
const create = {
	onBefore: async function (input) {
		const { key } = input
		let isExist = false
		try {
			await this.service('configuration').get({
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
	validateSchema: createSchema,
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
	indexingConfig: {
		fields: ['key'],
	},
}
