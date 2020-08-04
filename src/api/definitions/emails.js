/**
 * API Definitions for email service
 * This service is not intended to be used by
 * normal users.
 */
import Joi from 'joi'
import { compile } from 'handlebars'
import wkhtmltopdf from 'wkhtmltopdf'
const fonts = []

/**
 * Schema for create
 * @type {{password: *, email: *}}
 */
const createSchema = {
	template: Joi.string().default(null),
	to: Joi.string().email().required(),
	subject: Joi.string().when('template', {
		is: null,
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	from: Joi.string().email().when('template', {
		is: null,
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	data: Joi.object().when('template', {
		is: null,
		then: Joi.optional(),
		otherwise: Joi.required(),
	}),
	html: Joi.string().when('template', {
		is: null,
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	attachment: Joi.when('template', {
		is: null,
		then: Joi.array().items(Joi.object().required()).optional(),
		otherwise: Joi.optional(),
	}),
	/**
	 * Send minutes after which email will expire
	 */
	expiry: Joi.number().optional(),
}

/**
 * Create Method configuration
 */
const create = {
	validateSchema: createSchema,
	onBefore: async function (obj) {
		/**
		 * Every Property defined in the main obj overrides the email type configuration
		 */
		/**
		 * If Email Type if defined pick template, from,expiry from the type
		 */
		if (obj.expiry) {
			obj.expiryAt = obj.createdAt + obj.expiry * 60 * 1000
			delete obj.expiry
		}
		if (obj.attachment) {
			this.attachment = obj.attachment
			delete obj.attachment
		}
		obj.createdBy = obj.createdBy || 'system'
	},
	onAfter: async function (output) {
		const { helper } = this
		const { to, template, from, subject, html, key, data } = output
		const { attachment } = this
		const { value: currency } = await this.service('configuration').get({
			id: 'CURRENCY',
		})
		//Todo : Should pass adapter from server
		if (template) {
			const { subject, from, template: html, pdfTemplate } = await this.service(
				'email-template',
			).get({
				id: template,
			})
			data.emailKey = key
			data.currency = currency
			const attachment = []
			if (pdfTemplate && pdfTemplate !== 'empty') {
				const { name, template } = await this.service('pdf-template').get({
					id: pdfTemplate,
				})

				attachment.push({
					filename: compile(name)(data) + '.pdf',
					data: Buffer.concat(
						await readStream(
							await convertImagesAndFontsToBase64(compile(template)(data)),
							'A4',
						),
					),
				})
			}
			try {
				let email = await helper('email')
				await email.sendMail({
					from,
					to,
					subject: compile(subject)(data),
					html: compile(html)(data),
					attachment,
				})
			} catch (e) {
				console.error(e)
			}
		} else {
			let email = await helper('email')
			await email.sendMail({
				from,
				to,
				subject,
				html,
				attachment: attachment || [],
			})
		}
	},
}

async function readStream(html, pageSize) {
	if (typeof pageSize === 'string') {
		pageSize = { pageSize }
	}
	return await new Promise((resolve, reject) => {
		try {
			const stream = wkhtmltopdf(html, pageSize)
			let buffer = []
			stream.on('data', (data) => {
				buffer.push(data)
			})
			stream.on('end', () => {
				resolve(buffer)
			})
			stream.on('error', (e) => {
				reject(e)
			})
		} catch (e) {
			reject(e)
		}
	})
}
/**
 * Convert img srcs to base64 for pdfs
 * @param {*} html
 */
async function convertImagesAndFontsToBase64(html) {
	let m
	let newHtml = html
	let urls = []
	const imageRegex = /<img[^>]+src="?([^"\s]+)"?\s*\/>/g
	const request = require('request').defaults({ encoding: null })
	while ((m = imageRegex.exec(newHtml))) {
		urls.push(m[1])
	}
	urls = [...urls, ...fonts]
	await Promise.all(
		urls.map((url) => {
			return new Promise((resolve, reject) => {
				request.get(url, function (error, response, body) {
					if (!error && response.statusCode == 200) {
						const data =
							'data:' +
							response.headers['content-type'] +
							';base64,' +
							new Buffer(body).toString('base64')
						html = html.replace(url, data)
						resolve(data)
					} else {
						resolve(null)
					}
				})
			})
		}),
	)
	return html
}

module.exports = {
	create,
	// remove: false,
	security: {
		role: 'admin',
	},
}
