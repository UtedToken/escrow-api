/**
 * This API Definition for tasks related to reset password
 * e.g Send Forgot Password Mail
 * Reset Password
 * Change Password of already logged in user
 */
import Joi from 'joi'
import { getServerTimestamp } from '../../utils/test/utils/date'

/**
 * Send Password Reset Email via Create
 * @type {{method: *}}
 */
const create = {
	validateSchema: {
		email: Joi.string().email().required(),
	},
	method: async function (obj) {
		const { email } = obj
		const { displayName, uid } = await this.service('users').get({
			id: email,
		})
		const { expiry } = this.config.email.types['passwordReset']
		await this.service('emails').create({
			to: email,
			template: 'PasswordReset',
			data: {
				displayName: displayName || 'User',
				email,
				uid,
				link: await this.helper('generateWebClientLink')('reset-password'),
				expiry,
			},
		})
		return true
	},
}
const get = {
	method: async function (token, data) {
		const emailObj = await this.service('emails').get({
			id: token,
		})
		if (emailObj.used) {
			throw {
				status: 409,
				message: 'Token already used',
			}
		}

		if (getServerTimestamp() > emailObj.expiryAt) {
			throw {
				status: 403,
				message: 'Email is expired',
			}
		}
	},
}
/**
 * Update the password
 */
const update = {
	method: async function (token, data) {
		const { password } = data
		//todo : perhaps encrypt the password
		const emailObj = await this.service('emails').get({
			id: token,
		})

		//Check if email exists

		if (emailObj.used) {
			throw {
				status: 409,
				message: 'Token already used',
			}
		}

		if (getServerTimestamp() > emailObj.expiryAt) {
			throw {
				status: 403,
				message: 'Email is expired',
			}
		}

		//Mark the token as used by marking email as used.
		await this.service('emails').update({
			id: token,
			data: {
				used: true,
			},
		})

		const { uid, email } = emailObj.data
		//Check if Uid is found
		if (!uid) {
			throw 'No uid found in this email'
		} else {
			// Update the user confirmation status
			await this.service('users').update({
				id: uid,
				data: {
					password,
				},
			})
			// Send Password Reset Confirmation
			// this.service("emails").create({
			//     to: email,
			//     template: "passwordResetConfirm",
			//     data: {
			//         link: this.helper("generateWebClientLink")("login")
			//     }
			// });
		}
		return true
	},
}

module.exports = {
	create,
	remove: false,
	find: false,
	update: update,
	get,
}
