/**
 * Application configuration and bootstrapping is done
 * in this file
 */
if (!global._babelPolyfill) {
	require('babel-polyfill')
}
import http from 'http'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import initializeDb, { createAdminUser } from './db'
import createApi, { service } from './api'
import configureMiddlewares from './middlewares'
import { helper, configureHelpers } from './helpers'
import Config from './config'
import './utils/test/logging'
import { createError } from './utils/error'
import Indexer from './utils/search-indexer'
import { putInCache, getFromCache } from './utils/test/utils/cache'
import multer from 'multer'
import initializeCache from './intitialize-cache'
import initializeIndexes from './intitialize-indexes'

const { server, apiPrefix } = Config
const { corsHeaders, bodyLimit, port } = server
let app = express()
const multipartMiddleware = multer()
app.server = http.createServer(app)

// logger
app.use(morgan('dev'))

// 3rd party middleware
app.use(
	cors({
		exposedHeaders: corsHeaders,
	}),
)

app.use(
	bodyParser.json({
		limit: bodyLimit,
	}),
)
//
app.use(multipartMiddleware.single('file'))

/**
 * Set Server Config in memory cache
 * @returns {Promise<void>}
 */
async function setServerConfig() {
	const serverConfig = await service('server-config').find()
	let config = {}
	Object.values(serverConfig || {}).map((obj) => {
		if (obj.package && !config[obj.package]) {
			config[obj.package] = {}
		}
		config[obj.package][obj.key] = obj
	})

	putInCache('serverConfig', config || {})
}

/**
 * Get Server Config via key from memory cache
 * @returns {Promise<void>}
 */
function getServerConfig(packageName, key) {
	const serverConfig = getFromCache('serverConfig')
	return serverConfig[packageName] ? serverConfig[packageName][key] : null
}

/**
 * Create Search Indexer
 * @returns {Promise<void>}
 */
function createSearchIndexer(config) {
	const { searchIndexer } = config
	let indexer = null
	if (searchIndexer) {
		indexer = new Indexer(searchIndexer)
	}
	return indexer
}

/**
 * Initialize DB
 */
initializeDb(async (db) => {
	/**
	 * Put commonly used definitions in scope
	 * which will be bound to each API and each service
	 *
	 */
	let scope = {
		config: Config,
		...db,
		createError,
		service,
		getServerConfig,
		helper,
	}
	createAdminUser.apply(scope, [])
	/**
        Set Search Indexer
     */
	scope.searchIndexer = createSearchIndexer(scope.config)
	/**
	 * Create APIs and Services
	 */
	const apis = createApi(scope)
	/**
	 * Fetch Server Configuration using server-config service
	 */
	await setServerConfig()
	/**
	 * Configure helpers
	 */
	configureHelpers.apply(scope)
	/**
	 * Configure Before Middlewares which will be run before all APIS
	 */
	configureMiddlewares(app, scope, 'before')
	/**
	 * Configure API Router
	 */
	app.use(`/${apiPrefix}`, apis)
	app.get('/initialize-indexes', initializeIndexes.bind(scope))
	app.get('/initialize-cache', initializeCache.bind(scope))
	/**
	 * Configure Before Middlewares which will be run after all APIS
	 */
	configureMiddlewares(app, scope, 'after')

	/**
	 * Initialize Cache
	 */
	initializeCache.apply(scope, [])

	/**
	 * Initialize Cache
	 */
	initializeIndexes.apply(scope, [])

	/**
	 * Start Server
	 */
	app.server.listen(process.env.PORT || port, () => {
		console.log(`Started on port ${app.server.address().port}`)
	})
})

export default app
