const prefix = 'AC'
const minLength = 11
/**
 * get Code for New Cannot
 * @param code
 */
export function getCode(code = 0) {
	return (
		prefix +
		Array(minLength - code.toString().length)
			.fill(0)
			.join('') +
		(code + 1)
	)
}
