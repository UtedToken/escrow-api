/**
 * API Definitions for login of user
 */
import Joi from 'joi'
import { getCode } from '../../utils/cannot'
/**
 * Create Method configuration
 */
const find = {
	callback: async function (obj) {
		const counts = await this.firebaseAdmin.getRecord('/counts')
		return {
			...counts,
		}
	},
}

const pickup = {
	method: 'POST',
	callback: async function (req) {
		await Joi.validate(
			req.body,
			Joi.object().keys({
				sender: Joi.object().keys({
					companyName: Joi.string().required(),
					contactPersonName: Joi.string().required(),
					address: Joi.string().required(),
					cityTown: Joi.string().required(),
					state: Joi.string().required(),
					postCode: Joi.string().required(),
					contact: Joi.string().required(),
					email: Joi.string().required(),
				}),
				receiver: Joi.object().keys({
					companyName: Joi.string().required(),
					contactPersonName: Joi.string().required(),
					address: Joi.string().required(),
					cityTown: Joi.string().required(),
					state: Joi.string().required(),
					postCode: Joi.string().required(),
					contact: Joi.string().required(),
					email: Joi.string().required(),
				}),
				location: Joi.string().required(),
			}),
		)
		const ids = await this.firebaseAdmin.getRecord('/ids')
		const { cannot } = ids || {}
		const key = getCode(cannot)
		await this.firebaseAdmin.createRecord('/cannot', {
			...req.body,
			key,
			type: 'auto',
			status: 'inTransit',
		})
	},
}
module.exports = {
	security: false,
	additionalPaths: {
		stats: find,
		pickup,
	},
	disableNotDefinedMethods: true,
}
