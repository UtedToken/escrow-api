/**
 * Handle Unauthorized Access
 * @param req
 * @param res
 */
const unAuthorizedAccess = (req, res) => {
	res.sendStatus(403)
}
/**
 * Middleware to check if user is a admin
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<void>}
 */
export default async function (req, res, next) {
	const { security } = req
	//todo : Method Level Security also to be implemented
	if (security && security.role && security.role != '') {
		try {
			const isAdminUser =
				(req.user.role || '').toUpperCase() ==
				(security.role || '').toUpperCase()
			if (!isAdminUser) {
				throw this.createError('403', 'You do not have access to this API')
			}
		} catch (e) {
			console.error(e)
			next(e)
		}
	}
	next()
}
