import Joi from 'joi'
const createSchema = {
	key: Joi.string().required(),
	subject: Joi.string().required(),
	from: Joi.string().required(),
	templateVariables: Joi.string().optional().allow('', null),
	template: Joi.string().required(),
	pdfTemplate: Joi.string().optional().allow('', null),
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { key } = input
		let isExist = false
		try {
			await this.service('email-template').get({
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
	subject: Joi.string().optional(),
	from: Joi.string().optional(),
	template: Joi.string().optional(),
	templateVariables: Joi.string().optional().allow('', null),
	pdfTemplate: Joi.string().optional(),
}
const update = {
	validateSchema: updateSchema,
}

module.exports = {
	create,
	update,
	indexingConfig: {
		fields: ['key'],
	},
}
