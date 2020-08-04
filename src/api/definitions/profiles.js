/**
 * API Definitions for users
 */
import { USERS_PATH } from '../../utils/test/utils-firebase/firebase-admin/paths'
import { convertResultToArray } from '../../utils/firebase-util'

const Joi = require('joi')
import { update as updateMethod, get as getMethod } from '../generic'

const currentUpdateSchema = {
	//Put allowed profile updates here
}

/**
 * Schema for update - No need of create in case of firebase since
 * Anyways firebase will create the key if it does not exist
 */
const updateSchema = {
	role: Joi.string(),
	assignments: Joi.array().items(Joi.string().required()),
}

/**
 * Get Configuration
 */
const get = {
	method: async function (id) {
		let result
		result = await this.firebaseAdmin.getUserProfile(id)
		return result
	},
}
/**
 * Get All Configuration
 */
const find = {
	method: async function (input) {
		//todo : Use get User profiles method
		let result = await this.firebaseAdmin.getRecords(USERS_PATH, input)
		result = result.val()
		return convertResultToArray(result)
	},
}
/**
 * Update Configuration
 */
const update = {
	method: async function (id, input) {
		if (input.role) {
			const role = this.service('roles').find({
				code: input.role.toLowerCase(),
			})
			if (role.length == 0) {
				throw {
					status: 400,
					message: 'Role does not exist',
				}
			}
		}
		const result = this.firebaseAdmin.updateUserProfile(id, input)
		return result
	},
	validateSchema: updateSchema,
}

/**
 * Remove Configuration
 */

const remove = {
	method: async function (id) {
		const result = await this.firebaseAdmin.deleteUserProfile(id)
		return result
	},
}

/**
 * Get Current User
 */
const getCurrent = {
	callback: async function (req, res) {
		req.params.id = req.user.uid
		return getMethod.apply(
			{
				...this,
				...get,
			},
			arguments,
		)
	},
	security: true,
}

/**
 * Update Current User
 */
const updateCurrent = {
	callback: async function (req, res) {
		req.params.id = req.user.uid
		return updateMethod.apply(
			{
				...this,
				update: {
					...update,
					validateSchema: currentUpdateSchema,
					overrideIfNotExist: true,
				},
			},
			arguments,
		)
	},
	method: 'PATCH',
	security: true,
}

/**
 * Security Settings for this API
 */
const security = {
	role: 'admin',
}

module.exports = {
	security,
	create: false,
	get,
	find,
	update,
	remove,
	additionalPaths: {
		'current/get': getCurrent,
		'current/update': updateCurrent,
	},
}
