/**
 * API Definitions for registration of user
 */
const Joi = require('joi')
/**
 * Schema for create
 * @type {{password: *, email: *}}
 */
const createSchema = {
	firstName: Joi.string().required(),
	lastName: Joi.string().required(),
	email: Joi.string().required().email(),
	password: Joi.string().required(),
}
/**
 * Create Method configuration
 */
const create = {
	method: async function (obj) {
		const { email, password, firstName, lastName } = obj
		const response = await this.service('users').create({
			email,
			password,
			name: firstName + ' ' + lastName,
		})

		return response
	},
	validateSchema: createSchema,
}
module.exports = {
	create,
	disableNotDefinedMethods: true,
}
