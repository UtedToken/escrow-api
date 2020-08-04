/**
 * This API Definition for concatenating
 * all the configuration that is to be used
 * on web client so that web-client does not
 * have to do separate network calls here
 */
import Joi, { func } from 'joi'

/**
 * Find Method Config
 * @type {{method: *}}
 */
const all = {
	callback: async function () {
		const configurations = await this.service('configuration').find({
			all: true,
		})
		const gateway = await this.service('gateway').find({ all: true })
		return {
			config: [
				{
					package: 'sample',
					key: 'test',
					value: 'value',
				},
				...(configurations || []).map((configuration) => {
					const { key, value } = configuration
					return {
						package: 'configuration',
						key,
						value,
					}
				}),
				{
					package: 'payment',
					key: 'gateway',
					value: (gateway || []).map(({ apiSecret, ...data }) => data),
				},
			],
		}
	},
	security: false,
}

/**
 * Schema for create
 * @type {{password: *, email: *}}
 */
const createSchema = {
	key: Joi.string().required(),
	value: Joi.alternatives().try(Joi.object(), Joi.string()).required(),
	package: Joi.string().required(),
	description: Joi.string().required(),
}

/**
 * Create Method configuration
 */
const create = {
	validateSchema: createSchema,
}

module.exports = {
	create,
	security: {
		role: 'admin',
	},
	additionalPaths: {
		all,
		firebaseConfig: {
			callback: function () {
				return this.config.database.config
			},
			security: false,
		},
	},
}
