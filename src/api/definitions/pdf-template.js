import Joi from 'joi'
import { compile } from 'handlebars'
const createSchema = {
	key: Joi.string().required(),
	name: Joi.string().required(),
	templateVariables: Joi.string().optional().allow('', null),
	template: Joi.string().required(),
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { key } = input
		let isExist = false
		try {
			await this.service('pdf-template').get({
				id: key,
			})
			isExist = true
		} catch (e) {}
		if (isExist) {
			throw {
				status: 404,
				message: 'Template Already Exist',
			}
		}
	},
}
const updateSchema = {
	name: Joi.string().optional(),
	template: Joi.string().optional(),
	templateVariables: Joi.string().optional().allow('', null),
}
const update = {
	validateSchema: updateSchema,
}
const getMarkup = {
	security: true,
	method: 'POST',
	callback: async function (req) {
		await Joi.validate(
			req.body,
			Joi.object().keys({
				id: Joi.string().required(),
				data: Joi.object().required(),
			}),
		)
		const { id, data } = req.body
		const { template, name } = await this.service('pdf-template').get({
			id,
		})
		return {
			name: compile(name)(data),
			html: compile(template)(data),
		}
	},
}
module.exports = {
	security: {
		role: 'admin',
	},
	create,
	update,
	indexingConfig: {
		fields: ['key', 'name'],
	},
	additionalPaths: {
		getMarkup: getMarkup,
	},
}
