import service from './service'
import invoice from './invoice'
import customer from './customer'
/**
 * Export all the API defs with their url paths here
 */
const api = {
	customers: require('./customers'),
	authenticate: require('./authentication'),
	register: require('./register'),
	users: require('./users'),
	customer,
	'server-config': require('./server-config'),
	emails: require('./emails'),
	storage: require('./storage'),
	'web-client-config': require('./web-client-config'),
	'password-reset': require('./password-reset'),
	profiles: require('./profiles'),
	contact: require('./contact'),
	dashboard: require('./dashboard'),
	configuration: require('./configuration'),
	gateway: require('./gateway'),
	transaction: require('./transaction'),
	service,
	invoice,
	'email-template': require('./email-template'),
	'pdf-template': require('./pdf-template'),
}
export default api
