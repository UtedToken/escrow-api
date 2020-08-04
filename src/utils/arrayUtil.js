/**
 * Perform Async Function on Every element of Array and filters which rejects
 * @param array
 * @param promise
 */
export async function getArray(array, promise) {
	// We have to reverse loop of array in order to preserve original array indices
	// for e.g.->
	// for an array of 10 elements let say promise rejects at indices 3,4,7,
	// If array will be in serial order then if we delete 3rd element first,
	// then rejected index 4 will be shifted to 3 and original array index will not be preserved,
	// where if loop is reversed then deleting index 7 will not change index of 3,4 and hence,index will be preserved.
	for (let i = (array || []).length - 1; i >= 0; i--) {
		try {
			array[i] = await promise(array[i])
		} catch (e) {
			array.splice(i, 1)
		}
	}
	return array
}
