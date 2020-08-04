/**
 * API Definitions for users
 */
import Joi from 'joi'
import {
	getNonDefinedValuesObject,
	isValidEmail,
} from '../../utils/test/utils/common'
import { get as getMethod, update as updateMethod } from '../generic'
import { getArray } from '../../utils/arrayUtil'
/**
 * Schema for create
 * @type {{photoURL: *, password: *, phoneNumber: *, displayName: *, email: *}}
 */
const createSchema = {
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	password: Joi.string().required(),
	phoneNumber: Joi.string(),
	photoURL: Joi.string(),
	emailVerified: Joi.boolean(),
	role: Joi.string(),
}

/**
 * Schema for update
 * @type {{photoURL: *, password: *, phoneNumber: *, displayName: *, email: *}}
 */
const updateSchema = {
	name: Joi.string(),
	email: Joi.string().email(),
	password: Joi.string(),
	phoneNumber: Joi.string(),
	photoURL: Joi.string(),
	emailVerified: Joi.boolean(),
	disabled: Joi.boolean(),
	role: Joi.string(),
}
/**
 * Create Configuration
 */
const create = {
	method: async function (input) {
		const { name, email, password, phoneNumber, photoURL } = input
		const ids = await this.firebaseAdmin.getRecord('/ids')
		const { users } = ids || {}
		let output = await this.firebaseAdmin.createLocalUser(
			email,
			password,
			{
				role: 'user',
				id: (users || 0) + 1,
			},
			getNonDefinedValuesObject({
				displayName: name,
				phoneNumber,
				photoURL,
				emailVerified: true,
			}),
		)
		output = {
			...output,
			...output.profile,
			key: output.uid,
		}
		delete output.profile
		output.createdAt =
			output.metadata &&
			output.metadata.creationTime &&
			new Date(output.metadata.creationTime).getTime()
		const sendEmail = async () => {
			const { value: host } = await this.service('configuration').get({
				id: 'HOST',
			})
			this.service('emails').create({
				to: email,
				template: 'WelcomeUser',
				data: {
					displayName: name,
					username: email,
					password,
					host,
				},
			})
		}
		sendEmail()
		return output
	},
	validateSchema: createSchema,
}
/**
 * Get Configuration
 */
const getSchema = {
	method: async function (id) {
		let result
		if (isValidEmail(id)) {
			result = await this.firebaseAdmin.getUserByEmail(id)
		} else {
			result = await this.firebaseAdmin.getUserAuth(id)
		}
		return result
	},
	security: true,
}
/**
 * Get All Configuration
 */
const findByAuth = {
	method: async function (input) {
		const { nextPageToken, count } = input
		const result = await this.firebaseAdmin.getUsers(
			parseInt(count),
			nextPageToken,
		)
		return result
	},
}

/**
 * Find in /users path
 */
const find = {
	validateSchema: {
		userRole: Joi.string().optional(),
	},
	onAfter: async function (output, input) {
		if (input.all) {
			output = await getArray(output, async (item) => {
				const { key } = item
				item.user = await this.firebaseAdmin.getFullUserById(key)
				Object.keys(item.user || {}).forEach((key) => {
					item[key] = item.user[key]
				})
				delete item.user
				item.createdAt =
					item.metadata &&
					item.metadata.creationTime &&
					new Date(item.metadata.creationTime).getTime()
				return item
			})
		}
	},
}

/**
 * Update Configuration
 */
const update = {
	method: async function (id, input) {
		const {
			name,
			email,
			password,
			phoneNumber,
			photoURL,
			emailVerified,
			disabled,
		} = input
		const result = await this.firebaseAdmin.updateUser(
			id,
			getNonDefinedValuesObject({
				displayName: name,
				phoneNumber,
				email,
				password,
				photoURL,
				emailVerified,
				disabled,
			}),
		)
		return {
			...result,
			key: id,
		}
	},
	validateSchema: updateSchema,
}

/**
 * Remove Configuration
 */

const remove = {
	method: async function (id) {
		try {
			const result = await this.firebaseAdmin.deleteUser(id)
			return true
		} catch (e) {
			console.error('Error while deleting user', e)
			return false
		}
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
				get: {
					method: async function () {
						const result = await this.firebaseAdmin.getFullUserById(
							req.user.uid,
						)
						return result
					},
					responseSchema: {
						uid: Joi.any(),
						displayName: Joi.any(),
						photoURL: Joi.any(),
						email: Joi.any(),
						emailVerified: Joi.any(),
						role: Joi.any(),
						apps: Joi.any(),
						membership: Joi.any(),
					},
				},
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
					validateSchema: {
						name: Joi.string(),
						email: Joi.string().email(),
						oldPassword: Joi.string().when('password', {
							is: Joi.exist(),
							then: Joi.required(),
							otherwise: Joi.optional(),
						}),
						password: Joi.string(),
						phoneNumber: Joi.string(),
						photoURL: Joi.string(),
					},
					onBefore: async (obj) => {
						if (obj.data && (obj.data.password || obj.data.email)) {
							const user = req.user

							try {
								await this.firebaseCommon.authenticateLocal(
									user.email,
									obj.data.oldPassword,
								)
							} catch (e) {
								console.error(e)
								throw {
									status: '403',
									message: 'Current Password is incorrect',
								}
							}
						}
						delete obj.data.oldPassword
					},
					method: update.method,
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
	find,
	indexingConfig: function (input) {
		//console.log("User Role is", input.userRole)
		return {
			fields: ['displayName', 'email'],
			preFilter: input.userRole
				? (user) => {
						return user.role === input.userRole
				  }
				: null,
		}
	},
	create,
	get: getSchema,
	findByAuth,
	update,
	remove,
	additionalPaths: {
		'current/get': getCurrent,
		'current/update': updateCurrent,
	},
}
