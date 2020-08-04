export default async function () {
	setTimeout(() => {
		const contentTobeIndexed = [
			'users',
			'contact',
			'configuration',
			'service',
			'invoice',
			'customer',
			'email-template',
			'pdf-template',
		]
		contentTobeIndexed.map(async (path) => {
			if (this.config.searchIndexer) {
				const content = await this.service(path).find({
					all: true,
				})
				console.log('Indexing ' + path + ' Total - ' + content.length)
				await this.searchIndexer.buildIndex(
					(this.config.searchIndexer.indexPrefix || '') + path,
					content,
				)
				console.log('Finished Indexing ' + path)
			}
		})
	}, 1000)
}
