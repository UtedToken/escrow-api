/**
 * Initialize DB and Storage Adapters here
 */
import { FirebaseAdmin, FirebaseCommon } from './utils/test/utils-firebase'
import Config from './config'

export default (callback) => {
	const firebaseAdmin = new FirebaseAdmin(
		Config.database.admin,
		Config.database.url,
	)
	const firebaseCommon = new FirebaseCommon(
		Config.database.config,
		Config.database.url,
	)

	callback({
		firebaseAdmin,
		firebaseCommon,
	})
}

export async function createAdminUser() {
	const adminEmail = Config.admin.email
	let adminUser = null
	try {
		adminUser = await this.firebaseAdmin.getUserByEmail(adminEmail)
	} catch (e) {
		console.error('Admin User not found, Creating..')
	}
	if (!adminUser) {
		const { uid } = await this.firebaseAdmin.createLocalUser(
			Config.admin.email,
			Config.admin.password,
			{
				role: 'admin',
			},
		)
		await this.firebaseAdmin.updateUser(uid, {
			emailVerified: true,
		})
	}
}
