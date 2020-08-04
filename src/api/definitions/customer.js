import Joi from 'joi'
const createSchema = {
	customerName: Joi.string().required(),
	address: Joi.string().required(),
	homeNumber: Joi.string().optional().allow('', null),
	key: Joi.string().required(),
	officeNumber: Joi.string().optional().allow('', null),
	email: Joi.string().optional().allow('', null),
}
const updateSchema = {
	corporateNumber: Joi.string(),
	customerName: Joi.string(),
	address: Joi.string(),
	homeNumber: Joi.string().allow('', null),
	key: Joi.string(),
	officeNumber: Joi.string().allow('', null),
	email: Joi.string(),
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { key } = input
		let isExist = false
		try {
			await this.service('customer').get({
				id: key,
			})
			isExist = true
		} catch (e) {}
		if (isExist) {
			throw {
				status: 404,
				message: 'Customer Already Exist',
			}
		}
	},
}
const update = {
	overrideIfNotExist: true,
	validateSchema: updateSchema,
	onBefore: async function (input) {
		const { id, data } = input
		const { key } = data
		if (key && key !== id) {
			// getting old customer
			const {
				updatedAt,
				updatedBy,
				createdAt,
				createdBy,
				...customer
			} = await this.service('customer').get({
				id,
			})
			// creating new customer
			await this.service('customer').create({
				...customer,
				key,
			})
			// deleting old customer
			await this.service('customer').remove({
				id,
			})
			input.id = key
			input.data = {
				...customer,
				...data,
			}
			// console.log({
			//     input
			// })
		}
	},
}
module.exports = {
	security: true,
	indexingConfig: {
		fields: ['customerName', 'key'],
	},
	create,
	update,
}
