import Joi from 'joi'
import {
	getAuthErrorObject,
	convertResultToArray,
} from '../../utils/firebase-util'
import { getServerTimestamp } from '../../utils/test/utils/date'

const defaultGetSchema = {
	id: Joi.string().required(),
}
const defaultRemoveSchema = {
	id: Joi.string().required(),
}
const defaultFindSchema = {
	all: Joi.boolean(),
	nextPageToken: Joi.string(),
	count: Joi.number(),
	equalTo: Joi.string(),
	orderBy: Joi.string(),
	startAt: Joi.string(),
	startAtKey: Joi.string(),
	endAt: Joi.string(),
	endAtKey: Joi.string(),
}

/**
 * Check if response was already sent
 * @param res
 * @returns {*}
 */
function checkIfResponseAlreadySent(res) {
	return res && res.headersSent
}

/**
 * Send Success Response
 * @param res
 * @param data
 * @returns {*}
 */
function sendSuccessResponse(res, data) {
	if (res) {
		let output
		if (data instanceof Array) {
			output = [...data]
		} else if (data && data instanceof Object) {
			output = {
				...data,
			}
		} else {
			output = data
		}
		return res.status(200).send(output)
	} else {
		return data
	}
}

/**
 * create firebase record
 * @param req
 * @param res
 * @return {Promise<*|void|boolean>}
 */
export async function create(obj, req, res) {
	const { create, key, config } = this
	let { indexingConfig } = this
	const { onBefore, onAfter, onError, validateSchema, method, responseSchema } =
		create || {}
	try {
		await Joi.validate(obj, Joi.object().keys(validateSchema))
		let output
		obj.createdAt = getServerTimestamp()
		if (req && req.user) {
			obj.createdBy = req.user.uid
		}
		/**
		 * onBefore callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onBefore instanceof Function && (await onBefore.apply(this, [...arguments]))

		if (checkIfResponseAlreadySent()) {
			return
		}

		if (method instanceof Function) {
			output = await method.apply(this, [obj, ...arguments])
		} else {
			output = await this.firebaseAdmin.createRecord(`/${key}`, obj)
			output.key = output.path.split('/')[2]
		}

		if (indexingConfig && this.searchIndexer) {
			/**
			 * Here we have to take care that same key should not exist in query and params
			 * @type {{[p: string]: *}}
			 */
			if (indexingConfig instanceof Function) {
				indexingConfig = indexingConfig(obj)
			}
			const indexPrefix = (config.searchIndexer || {}).indexPrefix || ''
			if (indexingConfig.populate instanceof Function) {
				await this.searchIndexer.put(
					indexPrefix + key,
					await indexingConfig.populate.apply(this, [output]),
				)
			} else {
				await this.searchIndexer.put(indexPrefix + key, output)
			}
		}

		/**
		 * onAfter callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onAfter instanceof Function &&
			(await onAfter.apply(this, [output, ...arguments]))
		/**
		 * Filter Response acc to response schema
		 */
		if (responseSchema) {
			output = await Joi.validate(output, Joi.object().keys(responseSchema), {
				stripUnknown: true,
			})
		}
		if (checkIfResponseAlreadySent()) {
			return
		}
		return sendSuccessResponse(res, output)
	} catch (e) {
		/**
		 * Handle Error
		 */
		handleError.apply(this, [e, { onError: onError, input: obj }, ...arguments])
	}
}

/**
 * get All firebase records
 * @param req
 * @param res
 * @return {Promise<*|void|boolean>}
 */
export async function find(obj, req, res) {
	const { find, key, config } = this
	let { indexingConfig } = this
	const { onBefore, onAfter, onError, validateSchema, method, responseSchema } =
		find || {}
	try {
		let output
		if (indexingConfig && this.searchIndexer) {
			/**
			 * Here we have to take care that same key should not exist in query and params
			 * @type {{[p: string]: *}}
			 */
			if (indexingConfig instanceof Function) {
				indexingConfig = indexingConfig(obj)
			}
			await Joi.validate(
				obj,
				Joi.object().keys({
					all: Joi.boolean(),
					...config.searchIndexer.validateSchema,
					...validateSchema,
				}),
			)
		} else {
			await Joi.validate(
				obj,
				Joi.object().keys({
					...defaultFindSchema,
					...validateSchema,
				}),
			)
		}

		/**
		 * onBefore callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onBefore instanceof Function && (await onBefore.apply(this, [...arguments]))
		if (checkIfResponseAlreadySent()) {
			return
		}
		if (method instanceof Function) {
			output = await method.apply(this, [obj, ...arguments])
		} else {
			/**
			 * If we want to get all records
			 */
			if (obj && obj.all) {
				output = await this.firebaseAdmin.getRecord(`/${key}`)
				output = convertResultToArray(output)
				if (indexingConfig && indexingConfig.populate instanceof Function) {
					output = await Promise.all(
						output.map(async (item) => {
							return await indexingConfig.populate.apply(this, [item])
						}),
					)
				}
			} else if (indexingConfig && this.searchIndexer) {
				let requestConfig
				if (
					config.searchIndexer &&
					config.searchIndexer.getRequestConfig instanceof Function
				) {
					requestConfig = config.searchIndexer.getRequestConfig(obj)
				}
				const indexPrefix = (config.searchIndexer || {}).indexPrefix || ''
				if (indexingConfig instanceof Function) {
					indexingConfig = indexingConfig.apply(this, [...arguments])
				}
				//As of now allowing only string based search
				output = await this.searchIndexer.search(
					indexPrefix + key,
					obj.search,
					{
						...indexingConfig,
						...requestConfig,
						searchField: obj.searchField,
					},
				)
				if (
					config.searchIndexer &&
					config.searchIndexer.responseFilter instanceof Function
				) {
					output = config.searchIndexer.responseFilter(output)
				}
			} else {
				console.warn(
					'No indexer found, returning from firebase, Use firebase pagination parameters',
				)
				output = await this.firebaseAdmin.getPaginatedRecords(`/${key}`, obj)
				output = output.val()
				output = convertResultToArray(output)
			}
		}

		/**
		 * onAfter callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onAfter instanceof Function &&
			(await onAfter.apply(this, [output, ...arguments]))
		/**
		 * Filter Response acc to response schema
		 */
		if (responseSchema) {
			output = await Promise.all(
				output.map(async function (item) {
					return await Joi.validate(item, Joi.object().keys(responseSchema), {
						stripUnknown: true,
					})
				}),
			)
		}
		if (checkIfResponseAlreadySent()) {
			return
		}
		return sendSuccessResponse(res, output)
	} catch (e) {
		/**
		 * Handle Error
		 */
		handleError.apply(this, [e, { onError: onError, input: obj }, ...arguments])
	}
}

/**
 * get firebase records
 * @param req
 * @param res
 * @return {Promise<*|void|boolean>}
 */
export async function get(obj, req, res) {
	const { get, key } = this
	const {
		onBefore,
		onAfter,
		onError,
		validateSchema,
		method,
		onBeforeEach,
		onAfterEach,
		responseSchema,
	} = get || {}
	try {
		await Joi.validate(
			obj,
			Joi.object().keys({
				...defaultGetSchema,
				...validateSchema,
			}),
		)

		obj.id = obj.id.split(',')
		let output = {}
		let hasError = false
		/**
		 * onBefore callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onBefore instanceof Function && (await onBefore.apply(this, [...arguments]))
		if (checkIfResponseAlreadySent()) {
			return
		}

		await Promise.all(
			obj.id.map(async (id) => {
				try {
					onBeforeEach instanceof Function &&
						(await onBeforeEach.apply(this, [id, ...arguments]))
					if (method instanceof Function) {
						output[id] = await method.apply(this, [id, ...arguments])
					} else {
						output[id] = await this.firebaseAdmin.getRecord(`/${key}/${id}`)
					}
					if (output[id] === null) {
						throw {
							status: 404,
							message: 'Record does not exist',
						}
					}
					onAfterEach instanceof Function &&
						(await onAfterEach.apply(this, [output[id], id, ...arguments]))
					/**
					 * Filter Response acc to response schema
					 */
					if (responseSchema) {
						output[id] = await Joi.validate(
							output[id],
							Joi.object().keys(responseSchema),
							{
								stripUnknown: true,
							},
						)
					}
				} catch (error) {
					output[id] = parseSingleError(error)
					hasError = hasError || true
				}
				return output
			}),
		)
		if (hasError) {
			let errors = combineMultipleErrors(output)
			//todo : May be send record specific error detail - but its not as such needed in this case since it will only cause error if not found
			throw {
				status: 404,
				message:
					'Error occurred during deletion of one or more records since they were not found.',
				...errors,
			}
		} else {
			output = Object.keys(output || {}).map((key) => {
				if (typeof output[key] == 'object' && !output[key] instanceof Array) {
					return {
						key,
						...output[key],
					}
				} else {
					return output[key]
				}
			})
			if (output.length == 1) {
				output = output[0]
			}
		}
		/**
		 * onAfter callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onAfter instanceof Function &&
			(await onAfter.apply(this, [output, ...arguments]))
		if (checkIfResponseAlreadySent()) {
			return
		}

		return sendSuccessResponse(res, output)
	} catch (e) {
		/**
		 * Handle Error
		 */
		handleError.apply(this, [e, { onError: onError, input: obj }, ...arguments])
	}
}

/**
 * update a firebase record
 * @param req
 * @param res
 * @return {Promise<*|void|boolean>}
 */
export async function update(obj, req, res) {
	const { update, key, config } = this
	let { indexingConfig } = this
	const {
		onBefore,
		onAfter,
		onError,
		validateSchema,
		method,
		responseSchema,
		overrideIfNotExist,
	} = update || {}
	const { data } = obj

	try {
		await Joi.validate(data, Joi.object().keys(validateSchema))
		let output
		data.updatedAt = getServerTimestamp()
		if (req && req.user) {
			data.updatedBy = req.user.uid
		}
		onBefore instanceof Function && (await onBefore.apply(this, [...arguments]))
		const { id } = obj
		if (checkIfResponseAlreadySent()) {
			return
		}
		if (method instanceof Function) {
			output = await method.apply(this, [id, data, ...arguments])
		} else {
			output = await this.firebaseAdmin.updateRecord(
				`/${key}/${id}`,
				data,
				overrideIfNotExist,
			)
			output.key = output.path.split('/')[2]
		}
		//Need to check that it merges the doc in store instead of replacing
		if (indexingConfig && this.searchIndexer) {
			/**
			 * Here we have to take care that same key should not exist in query and params
			 * @type {{[p: string]: *}}
			 */
			if (indexingConfig instanceof Function) {
				indexingConfig = indexingConfig(obj)
			}
			const indexPrefix = (config.searchIndexer || {}).indexPrefix || ''

			if (indexingConfig.populate instanceof Function) {
				await this.searchIndexer.update(
					indexPrefix + key,
					await indexingConfig.populate.apply(this, [output]),
				)
			} else {
				await this.searchIndexer.update(indexPrefix + key, output)
			}
		}
		/**
		 * onAfter callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onAfter instanceof Function &&
			(await onAfter.apply(this, [output, ...arguments]))
		if (responseSchema) {
			output = await Joi.validate(output, Joi.object().keys(responseSchema), {
				stripUnknown: true,
			})
		}
		if (checkIfResponseAlreadySent()) {
			return
		}

		return sendSuccessResponse(res, output)
	} catch (e) {
		/**
		 * Handle Error
		 */
		handleError.apply(this, [e, { onError: onError, input: obj }, ...arguments])
	}
}

/**
 * remove firebase records
 * @param req
 * @param res
 * @param next
 * @return {Promise<*|void|boolean>}
 */
export async function remove(obj, req, res, next) {
	const { remove, key, config } = this
	let { indexingConfig } = this
	const {
		onBefore,
		onAfter,
		onError,
		validateSchema,
		method,
		onBeforeEach,
		onAfterEach,
	} = remove || {}
	try {
		let output = {}
		let hasError = false
		await Joi.validate(
			obj,
			Joi.object().keys({
				...defaultRemoveSchema,
				...validateSchema,
			}),
		)
		obj.id = obj.id.split(',')
		/**
		 * onBefore callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onBefore instanceof Function && (await onBefore.apply(this, [...arguments]))
		if (checkIfResponseAlreadySent()) {
			return
		}
		await Promise.all(
			obj.id.map(async (id) => {
				try {
					onBeforeEach instanceof Function &&
						(await onBeforeEach.apply(this, [id, ...arguments]))
					if (method instanceof Function) {
						output[id] = await method.apply(this, [id, ...arguments])
					} else {
						output[id] = await this.firebaseAdmin.deleteRecord(`/${key}/${id}`)
					}

					if (output[id] === null) {
						throw {
							status: 404,
							message: 'Record does not exist',
						}
					}
					if (indexingConfig && this.searchIndexer) {
						/**
						 * Here we have to take care that same key should not exist in query and params
						 * @type {{[p: string]: *}}
						 */
						if (indexingConfig instanceof Function) {
							indexingConfig = indexingConfig(obj)
						}
						const indexPrefix = (config.searchIndexer || {}).indexPrefix || ''
						await this.searchIndexer.remove(indexPrefix + key, { key: id })
					}
					onAfterEach instanceof Function &&
						(await onAfterEach.apply(this, [output[id], id, ...arguments]))
				} catch (error) {
					output[id] = parseSingleError(error)
					hasError = hasError || true
				}
			}),
		)
		if (hasError) {
			let errors = combineMultipleErrors(output)
			//todo : May be send record specific error detail - but its not as such needed in this case since it will only cause error if not found
			throw {
				status: 404,
				message:
					'Error occurred during deletion of one or more records since they were not found.',
				...errors,
			}
		}

		/**
		 * onAfter callback is intended to return false in case it has
		 * already sent response and throw onError normally in case there is
		 * a validation onError or any onError onBefore creating the record
		 */
		onAfter instanceof Function &&
			(await onAfter.apply(this, [output, ...arguments]))
		if (checkIfResponseAlreadySent()) {
			return
		}
		return sendSuccessResponse(res, output)
	} catch (e) {
		/**
		 * Handle Error
		 */
		handleError.apply(this, [e, { onError: onError, input: obj }, ...arguments])
	}
}

/**
 * Execute additional Callbacks in a error
 * handled context
 * @param callback
 * @returns {Promise<Function>}
 */
export function executeCallback(callback) {
	return async function (req, res, next) {
		try {
			const response = await callback.apply(this, [...arguments])
			/**
			 * If the response is not sent from callback, Send 200 as status
			 */
			if (!res.headersSent) {
				return res.status(200).send(response || null)
			}
		} catch (e) {
			handleError.apply(this, [e, null, null, ...arguments])
		}
	}
}

/**
 * Parse Single Errors
 * @param error
 * @returns {{error: boolean}}
 */
function parseSingleError(error) {
	let output = {
		error: true,
	}
	if (error) {
		if (error.status) {
			output.status = error.status
		}

		if (error.message) {
			output.message = error.message
		}
		if (error.stack) {
			output.stack = error.stack.toString()
		}
	}
	return output
}

/**
 * Combine Multiple Record Errors
 * @param output
 */
function combineMultipleErrors(output) {
	let details = {}
	let status
	let message = ''
	Object.keys(output || {})
		.filter((key) => {
			return !!output[key].error
		})
		.map((key) => {
			details[key] = output[key]
			if (details[key].error) {
				status = message || details[key].status
				message = message || details[key].message
			}
		})
	return {
		details,
		status,
		message,
	}
}

/**
 * Handle Error
 * @param req
 * @param res
 * @param data - Data for that method e.g input data in case of create
 * @param next
 * @param e
 * @param config
 * @return {*|void|boolean}
 */
function handleError(e, config, data, req, res, next) {
	config = config || {}
	const { onError } = config
	if (e && e.isJoi) {
		delete e.isJoi
		delete e._object
		e.status = 400
	}

	e = getAuthErrorObject(e)
	/**
	 * Execute on Error
	 */
	if (onError instanceof Function) {
		/**
		 * Check in case onError has returned any status or
		 * message field
		 * @type {*|{}}
		 */
		onError.apply(this, [arguments])
	}
	if (res && !res.headersSent && typeof next != 'undefined') {
		next(e)
	} else {
		throw e
	}
}
