import Joi from 'joi'
import { formatDate } from '../../utils/date'
import { checkRoleAuthorization } from './authentication'
const createSchema = {
	key: Joi.string().required(),
}
function pad(str, max) {
	str = str.toString()
	return str.length < max ? pad('0' + str, max) : str
}
const create = {
	validateSchema: createSchema,
	onBefore: async function (input) {
		const { key } = input
		const service = await this.service('service').get({
			id: key,
		})
		Object.keys(service || {}).forEach((key) => {
			input[key] = service[key]
		})
		const ids = await this.firebaseAdmin.getRecord('/ids')
		const { invoice } = ids || {}
		input.id = `INV${new Date().getFullYear()}${pad((invoice || 0) + 1, 4)}`
		input.generatedDate = new Date().toLocaleString()
	},
	onAfter: async function (output) {
		const { parts, labourTransportCosts, key } = output
		const total =
			(parts || []).reduce((sum, { partCost }) => {
				if (partCost && !isNaN(partCost)) {
					return (sum = sum + parseFloat(partCost))
				} else {
					return sum
				}
			}, 0) + (labourTransportCosts || 0)
		if (typeof output.customer === 'string') {
			output.customerKey = output.customer
			output.customer = await this.service('customer').get({
				id: output.customer,
			})
			output.customer.key = output.customerKey
		} else {
			output.customerKey = output.customer.key
		}
		if (output.customer.email) {
			const data = await this.service('configuration').get({
				id: 'HOST,INVOICELOGO',
			})

			this.service('emails').create({
				to: output.customer.email,
				template: 'InvoiceCreate',
				data: {
					...output,
					...output.customer,
					invoiceKey: key,
					total,
					host: data[0].value,
					invoiceLogo: data[1].value,
					date: formatDate(output.updatedAt, 'DD/MM/YYYY'),
				},
			})
		}
	},
}
async function sendInvoice(id) {
	let invoice = await this.service('invoice').get({
		id,
	})
	const { parts, labourTransportCosts, customer } = invoice
	const total =
		(parts || []).reduce((sum, { partCost }) => {
			if (partCost && !isNaN(partCost)) {
				return (sum = sum + parseFloat(partCost))
			} else {
				return sum
			}
		}, 0) + (labourTransportCosts || 0)
	const data = await this.service('configuration').get({
		id: 'HOST,INVOICELOGO',
	})
	if (typeof customer === 'string') {
		invoice.customer = await this.service('customer').get({
			id: customer,
		})
	}
	this.service('emails').create({
		to: invoice.customer.email,
		template: 'InvoiceCreate',
		data: {
			invoiceKey: id,
			...invoice,
			host: data[0].value,
			invoiceLogo: data[1].value,
			total,
			paid: !!invoice.payment,
		},
	})
}
const updateSchema = {
	payment: Joi.object().required(),
	paid: Joi.boolean().optional(),
}
const update = {
	security: false,
	validateSchema: updateSchema,
}
module.exports = {
	security: true,
	create,
	update,
	get: {
		security: false,
	},
	additionalPaths: {
		'sendInvoice/:id': {
			method: 'POST',
			callback: async function (req, res) {
				checkRoleAuthorization('admin', req, res)
				const { id } = req.params
				await sendInvoice.apply(this, [id])
				return true
			},
		},
		'markAsPaid/:id': {
			method: 'POST',
			callback: async function (req, res) {
				checkRoleAuthorization('admin', req, res)
				const { id } = req.params
				const invoice = await this.service('invoice').get({ id })
				if (!invoice.paid) {
					await this.service('invoice').update({
						id,
						data: {
							paid: true,
							payment: {
								status: 'Marked Manually by user',
							},
						},
					})
				}
				return true
			},
		},
		'billTo/:id': {
			method: 'POST',
			callback: async function (req, res) {
				checkRoleAuthorization('admin', req, res)
				await Joi.validate(
					req.body,
					Joi.object().keys({
						billTo: Joi.string().required(),
						email: Joi.string().required(),
					}),
				)
				const { id } = req.params
				const { billTo, email } = req.body
				const invoice = await this.service('invoice').get({
					id,
				})
				const { customer } = invoice
				if (typeof customer === 'string') {
					invoice.customer = await this.service('customer').get({
						id: customer,
					})
				}
				//invoice.customer.billTo = billTo;
				invoice.total =
					(invoice.parts || []).reduce((sum, item) => {
						const { partCost } = item
						return sum + parseFloat(partCost)
					}, 0) + (invoice.labourTransportCosts || 0)
				const sendEmail = async () => {
					const data = await this.service('configuration').get({
						id: 'HOST,INVOICELOGO',
					})
					this.service('emails').create({
						to: email,
						template: 'InvoiceCreate',
						data: {
							host: data[0].value,
							invoiceLogo: data[1].value,
							...invoice,
							invoiceKey: id,
							billTo,
						},
					})
				}
				sendEmail()
			},
		},
	},
	indexingConfig: {
		fields: ['customerName', 'mobileNumber', 'createdDate', 'id', 'isPaid'],
		populate: async function (output) {
			// console.log("Populate Called")
			const { key } = output
			try {
				if (!output.customer) {
					output = await this.service('invoice').get({
						id: key,
					})
				}
				if (typeof output.customer !== 'object') {
					const customer = await this.service('customer').get({
						id: output.customer,
					})
					customer.mobileNumber = customer.key
					delete customer.key
					output = {
						...output,
						...customer,
						createdDate: formatDate(output.createdAt),
					}
				}
				output.timestamp = new Date(output.date).getTime()
				output.isPaid = !!output.payment
				output.key = key
				return output
			} catch (e) {
				console.log('Error while populating - ', e, output)
			}
		},
	},
}
