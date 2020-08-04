import Joi from 'joi'
const createSchema = {
	companyName: Joi.string().required(),
	contactPersonName: Joi.string().required(),
	country: Joi.string().required(),
	address: Joi.string().required(),
	cityTown: Joi.string().required(),
	state: Joi.string().required(),
	postCode: Joi.number().required(),
	contact: Joi.string().required(),
	email: Joi.string().required(),
}
const updateSchema = {
	companyName: Joi.string().optional(),
	contactPersonName: Joi.string().optional(),
	address: Joi.string().optional(),
	country: Joi.string().optional(),
	cityTown: Joi.string().optional(),
	state: Joi.string().optional(),
	postCode: Joi.number().optional(),
	contact: Joi.string().optional(),
	email: Joi.string().optional(),
}
const create = {
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
}
