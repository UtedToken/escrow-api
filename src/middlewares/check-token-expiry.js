/**
 * Middleware to check if user is a admin
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<void>}
 */
export default async function (req, res, next) {
	const { security, headers } = req
	if (security != false) {
		try {
			const authToken = headers['Authorization'] || headers['authorization']
			const auth = await this.firebaseAdmin.verifyIdToken(authToken)
			//todo : Why not fetch only user role from firebase with /userid/role
			const user = await this.firebaseAdmin.getUserByToken(authToken)
			req.user = {
				...auth,
				...user,
			}
			next()
		} catch (e) {
			if (e && e.codePrefix == 'auth') {
				next(this.createError(401, 'No Valid Auth Token Found'))
			} else {
				next(this.createError(500, 'Error while parsing token'))
			}
		}
	} else {
		next()
	}
}
