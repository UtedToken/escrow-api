import Joi from 'joi'
const createSchema = {
	key: Joi.string().required(),
	date: Joi.string().required(),
	corporateNumber: Joi.string().optional().allow('', null),
	customer: Joi.alternatives(
		Joi.string().required(),
		Joi.object()
			.keys({
				customerName: Joi.string().required(),
				address: Joi.string().required(),
				homeNumber: Joi.string().optional().allow('', null),
				key: Joi.string().required(),
				officeNumber: Joi.string().optional().allow('', null),
				email: Joi.string().optional().allow('', null),
			})
			.required(),
	).required(),
	saveCustomer: Joi.boolean(),
	productType: Joi.string().required(),
	productBrand: Joi.string().required(),
	model: Joi.string().required(),
	serialNumber: Joi.string().optional().allow('', null),
	jobStatus: Joi.string().required(),
	sign: Joi.optional().allow('', null),
	faultReported: Joi.string().optional().allow('', null),
	faultDiagnosed: Joi.string().optional().allow('', null),
	serviceDetails: Joi.string().optional().allow('', null),
	repairCompletedDate: Joi.string().optional().allow('', null),
	parts: Joi.array().items(
		Joi.object().keys({
			partName: Joi.string().required(),
			partCost: Joi.number().required(),
		}),
	),
	labourTransportCosts: Joi.number().optional().allow('', null),
	generalRemarks: Joi.string().optional().allow('', null),
	attachment: Joi.array().items().allow(null),
}
const updateSchema = {
	sent: Joi.boolean(),
	jobNumber: Joi.string(),
	date: Joi.string(),
	corporateNumber: Joi.string().optional(),
	customer: Joi.alternatives(
		Joi.string().required(),
		Joi.object()
			.keys({
				customerName: Joi.string().required(),
				address: Joi.string().required(),
				homeNumber: Joi.string().optional().allow('', null),
				key: Joi.string().required(),
				officeNumber: Joi.string().optional().allow('', null),
				email: Joi.string().optional().allow('', null),
			})
			.required(),
	),
	parts: Joi.array().items(
		Joi.object().keys({
			partName: Joi.string().required(),
			partCost: Joi.number().required(),
		}),
	),
	saveCustomer: Joi.boolean(),
	productType: Joi.string(),
	productBrand: Joi.string(),
	model: Joi.string(),
	serialNumber: Joi.string(),
	jobStatus: Joi.string().optional(),
	sign: Joi.optional().allow('', null),
	faultReported: Joi.string().optional().allow('', null),
	faultDiagnosed: Joi.string().optional().allow('', null),
	serviceDetails: Joi.string().optional().allow('', null),
	repairCompletedDate: Joi.string().optional().allow('', null),
	partsUsed: Joi.string().optional().allow('', null),
	partsCosts: Joi.number().optional().allow('', null),
	labourTransportCosts: Joi.number().optional().allow('', null),
	generalRemarks: Joi.string().optional().allow('', null),
	attachment: Joi.array().items().allow(null),
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { customer, saveCustomer, key } = input
		let isExist = false
		try {
			await this.service('service').get({
				id: key,
			})
			isExist = true
		} catch (e) {}
		if (isExist) {
			throw {
				status: 409,
				message: 'Service Already Exist',
			}
		}
		if (typeof customer === 'object' && saveCustomer) {
			const { key } = await this.service('customer').create(customer)
			input.customer = key
		}
		input.generatedDate = new Date().toLocaleString()
	},
	onAfter: async function (output) {
		const { jobStatus, key, parts, labourTransportCosts } = output
		const total =
			(parts || []).reduce((sum, { partCost }) => {
				if (partCost && !isNaN(partCost)) {
					return (sum = sum + parseFloat(partCost))
				} else {
					return sum
				}
			}, 0) + (labourTransportCosts || 0)
		if (jobStatus === 'Completed') {
			await this.service('invoice').create({
				key,
			})
		}
		if (typeof output.customer === 'string') {
			output.customer = await this.service('customer').get({
				id: output.customer,
			})
		}
		if (output.customer.email) {
			const sendEmail = async () => {
				const { value: invoiceLogo } = await this.service('configuration').get({
					id: 'INVOICELOGO',
				})
				this.service('emails').create({
					to: output.customer.email,
					template: 'ServiceCreate',
					data: {
						invoiceLogo,
						...output,
						serviceKey: key,
						total,
					},
				})
			}
			sendEmail()
		}
	},
}
const update = {
	validateSchema: updateSchema,
	onBefore: async function (input) {
		const { customer, saveCustomer } = input
		if (typeof customer === 'object' && saveCustomer) {
			const { key } = await this.service('customer').create(customer)
			input.customer = key
		}
	},
	onAfter: async function (output, input) {
		const { key } = output
		const { parts, labourTransportCosts } = await this.service('service').get({
			id: key,
		})
		const total =
			(parts || []).reduce((sum, { partCost }) => {
				if (partCost && !isNaN(partCost)) {
					return (sum = sum + parseFloat(partCost))
				} else {
					return sum
				}
			}, 0) + (labourTransportCosts || 0)
		//Only when first time status is changed, this should happen.
		if (input.data && input.data.jobStatus === 'Completed') {
			this.service('invoice').create({
				key,
			})
		}
		const sendEmail = async () => {
			const service = await this.service('service').get({
				id: key,
			})
			if (typeof service.customer === 'string') {
				service.customer = await this.service('customer').get({
					id: service.customer,
				})
			}

			const to = service.email || service.customer.email
			if (to) {
				this.service('emails').create({
					to,
					template: 'ServiceChange',
					data: {
						...service,
						...service.customer,
						serviceKey: key,
						total,
					},
				})
			}
		}
		sendEmail()
	},
}

const getCurrent = {
	method: 'GET',
	security: true,
	callback: async function (req) {
		const { serviceJobPrefix, role } = req.user
		if (role === 'admin') {
			throw {
				status: 500,
				message: 'Admin does not have access to this API',
			}
		}
		return await this.service('service').find({
			...req.query,
			serviceJobPrefix,
		})
	},
}

const find = {
	validateSchema: {
		serviceJobPrefix: Joi.string(),
	},
}
const send = {
	method: 'POST',
	security: true,
	callback: async function (req) {
		await Joi.validate(
			req.body,
			Joi.object().keys({
				email: Joi.string().required(),
			}),
		)
		const { id } = req.params
		const { email } = req.body
		const service = await this.service('service').get({
			id,
		})
		const { customer } = service
		if (typeof customer === 'string') {
			service.customer = await this.service('customer').get({
				id: customer,
			})
		}
		service.total =
			(service.parts || []).reduce((sum, item) => {
				const { partCost } = item
				return sum + parseFloat(partCost)
			}, 0) + (service.labourTransportCosts || 0)

		const sendEmail = async () => {
			const { value: invoiceLogo } = await this.service('configuration').get({
				id: 'INVOICELOGO',
			})
			this.service('emails').create({
				to: email,
				template: 'ServiceCreate',
				data: {
					...service,
					serviceKey: id,
					invoiceLogo,
				},
			})
		}
		sendEmail()
	},
}
const getJobNumber = {
	method: 'GET',
	security: false,
	callback: async function () {
		const { type, value } = await this.service('configuration').get({
			id: 'JOBNUMBERFORMAT',
		})
		const { service } = await this.firebaseAdmin.getRecord('/counts')
		const count = Object.values(service || {}).reduce(
			(sum, num) => sum + (num || 0),
			1,
		)
		if (type === 'text') {
			const index = value.indexOf('X')
			return (
				value.substring(0, index) +
				count.toString().padStart(value.length - index, 0)
			)
		}
	},
}
module.exports = {
	security: true,
	create,
	update,
	find,
	additionalPaths: {
		current: getCurrent,
		'send/:id': send,
		getJobNumber,
	},
	remove: {
		onAfterEach: async function (output, id) {
			try {
				//if(output.jobStatus === "Completed"){
				await this.service('invoice').remove({ id })
				//}
			} catch (e) {
				console.error('Error while removing invoice ', e)
			}
		},
	},
	indexingConfig: (input) => {
		const { serviceJobPrefix } = input
		return {
			fields: [
				'customerName',
				'monthYear',
				'phoneNumber',
				'jobStatus',
				'serialNumber',
				'corporateNumber',
				'key',
				'model',
				'customer',
				'homeNumber',
				'officeNumber',
				'year',
				'month',
			],
			preFilter: serviceJobPrefix
				? (service) => {
						const { key } = service
						if (Array.isArray(serviceJobPrefix)) {
							serviceJobPrefix.forEach((item) => {
								if (key.startsWith(item)) {
									return true
								}
							})
							return false
						} else {
							return key.startsWith(serviceJobPrefix)
						}
				  }
				: null,
			populate: async function (output) {
				//console.log("Populate Called")
				const { key, date } = output
				try {
					if (!output.customer) {
						output = await this.service('service').get({
							id: key,
						})
					}
					if (typeof output.customer !== 'object') {
						const customer = await this.service('customer').get({
							id: output.customer,
						})
						output.customerKey = customer.key
						delete customer.key
						output = {
							...output,
							...customer,
						}
					}
					output.key = key
					output.month = (new Date(date).getMonth() + 1).toString()
					output.year = new Date(date).getFullYear().toString()
					output.monthYear =
						(output.month < 10 ? '0' + output.month : output.month) +
						'/' +
						output.year
					output.timestamp = new Date(date).getTime()
					output.phoneNumber = `${output.customerKey} ${
						output.homeNumber || ''
					} ${output.officeNumber || ''}`
					return output
				} catch (e) {
					console.log('Error while populating - ', e)
				}
			},
		}
	},
}
