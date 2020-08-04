import { putInCache } from './utils/test/utils/cache'

export default async function () {
	const contentTobeCached = []
	contentTobeCached.map(async (path) => {
		if (this.config.searchIndexer) {
			const content = await this.service(path).find({
				all: true,
			})
			console.log('Caching ' + path + ' Total - ' + content.length)
			putInCache(path, content)
			console.log('Finished Caching ' + path)
		}
	})
}
