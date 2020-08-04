const Joi = require('joi')
const createSchema = {
	message: Joi.string().required(),
	email: Joi.string().required(),
	name: Joi.string().required(),
}
module.exports = {
	create: {
		validateSchema: createSchema,
		onAfter: async function (obj) {
			const { email, name, message } = obj
			let to
			try {
				const { value, type } = await this.service('configuration').get({
					id: 'ENQUIRYEMAIL',
				})
				if (type === 'text') {
					to = value
				}
			} catch (e) {}
			if (to) {
				this.service('emails').create({
					template: 'Contact',
					to,
					data: {
						email,
						name,
						message,
					},
				})
			}
			return true
		},
	},
	indexingConfig: {
		fields: ['email', 'name', 'message'],
	},
}
