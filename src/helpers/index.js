import emailHelper from '../utils/test/utils-mail'
import storageHelper from '../utils/test/utils-mail'
import { getFromCache, putInCache } from '../utils/test/utils/cache'

/**
 * Helper Map
 * todo : Refactor code to merge both server configuration and code configuration
 */
let helpers = {}

/**
 * Get Helper
 * @param key
 * @returns {*}
 */
export function helper(key) {
	if (!helpers[key]) {
		throw `No helper found with key - ${key}`
	}
	return helpers[key]
}

/**
 * Get Helper
 * @param key
 * @returns {*}
 */
export function configureHelpers() {
	const { config, getServerConfig } = this
	/**
	 * Configure Email helper
	 */
	helpers.email = getEmailHelper.apply(this, [config, getServerConfig])
	helpers.generateWebClientLink = generateWebClientLink.bind(this)
	helpers.storage = getStorageHelper.apply(this, [config, getServerConfig])
	helpers.getEmailConfig = getEmailConfig.bind(this)
	helpers.getResourceUrl = getResourceUrl.bind(this)
	helpers.addInCache = addInCache //.bind(this);
	helpers.updateInCache = updateInCache //.bind(this);
	helpers.getIndexName = getIndexName.bind(this)
}

/**
 * Configure Email helper
 * @param config
 * @param getServerConfig
 */
async function getEmailHelper(config, getServerConfig) {
	const { value: apiKey } = await this.service('configuration').get({
		id: 'MAILGUN_API_KEY',
	})
	const { value: domain } = await this.service('configuration').get({
		id: 'MAILGUN_DOMAIN',
	})
	let adapter = getServerConfig('email', 'adapter') || {}
	adapter = adapter.value || config.email.adapter
	if (!adapter) {
		throw 'No Email Adapter configuration found while configuring email helper'
	}
	let configurationFromServer = getServerConfig('email', adapter)
	if (configurationFromServer) {
		configurationFromServer = configurationFromServer.value
	}
	let helper = emailHelper({
		...config.email[adapter],
		...configurationFromServer,
		adapter,
		apiKey,
		domain,
	})

	return helper
}

/**
 * Configure Storage helper
 * @param config
 * @param getServerConfig
 */
async function getStorageHelper(config, getServerConfig) {
	const { value: bucket } = await this.service('configuration').get({
		id: 'AWS_BUCKET',
	})
	const { value: region } = await this.service('configuration').get({
		id: 'AWS_REGION',
	})
	const { value: accessKeyId } = await this.service('configuration').get({
		id: 'AWS_ACCESS_KEY_ID',
	})
	const { value: secretAccessKey } = await this.service('configuration').get({
		id: 'AWS_SECRET_KEY',
	})
	let adapter = getServerConfig('storage', 'adapter') || {}
	adapter = adapter.value || config.storage.adapter
	if (!adapter) {
		throw 'No Storage Adapter configuration found while configuring storage helper'
	}
	let configurationFromServer = getServerConfig('storage', adapter)
	if (configurationFromServer) {
		configurationFromServer = configurationFromServer.value
	}
	let helper = new storageHelper({
		...config.storage[adapter],
		...configurationFromServer,
		adapter,
		accessKeyId,
		secretAccessKey,
		bucket,
		region,
	})
	return helper
}

/**
 * Generate Email Links from the
 * supported path and params
 */
async function generateWebClientLink(path, params) {
	const { config, getServerConfig } = this
	const { value: host } = await this.service('configuration').get({
		id: 'HOST',
	})
	let webClientConfig = getServerConfig('webClient')
	webClientConfig = {
		...config.webClient,
		...webClientConfig,
	}

	let queryParams = ''
	Object.keys(params || {}).map((key) => {
		queryParams += `${key}=${params[key]}`
	})
	if (queryParams != '') {
		queryParams = '?' + queryParams
	}

	return `${host}/${path}${queryParams}`
}

/**
 * Get Email configuration for a specific type
 * @param type
 */
function getEmailConfig(type) {
	const { config, getServerConfig } = this
	let emailTypesConfig = getServerConfig('email', 'types')
	emailTypesConfig = {
		...config.email.types,
		...emailTypesConfig,
	}
	return emailTypesConfig[type] || null
}

/**
 * Get Resource url
 * @param resourceId
 * @returns {string}
 */
function getResourceUrl(resourceId) {
	const { config } = this
	return `${config.host}/${config.apiPrefix}/storage/download/${resourceId}`
}

/**
 * Add  in cache
 * @param quote
 */
function addInCache(obj) {
	let data = getFromCache(this.key) || []
	data.push(obj)
	putInCache(this.key, data)
}

/**
 * Update Quote in cache
 * @param quote
 */
function updateInCache(obj) {
	let data = getFromCache(this.key) || []
	data.find((item, index) => {
		if (item.key === obj.key) {
			data[index] = obj
		}
	})
	putInCache(this.key, data)
}

/**
 * Get Index name
 * @param key
 * @returns {*}
 */
function getIndexName(key) {
	const indexPrefix = (this.config.searchIndexer || {}).indexPrefix || ''
	return indexPrefix + key
}
