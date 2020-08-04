import axios from 'axios'
const host = 'https://api.stripe.com'
module.exports = async function (payment, gateway) {
	const { apiKey, apiSecret } = gateway
	const {
		id: source,
		amount,
		currency,
		// card
	} = payment
	//const {id}=card;
	const headers = {
		Authorization: 'Bearer ' + apiSecret,
		'Content-Type': 'application/x-www-form-urlencoded',
	}
	try {
		const { id } = await request('/v1/customers', headers, null)
		await request('/v1/customers/' + id + '/sources', headers, {
			source,
		})
		const { status, captured } = await request('/v1/charges', headers, {
			customer: id,
			currency,
			amount,
		})
		if (captured && status === 'succeeded') {
			return
		} else {
			throw {
				status: 404,
				message: 'Payment Not Verified',
			}
		}
	} catch (e) {
		console.error(e.response.data)
		throw e.response.data
	}
}
function queryString(obj) {
	return Object.keys(obj || {})
		.map((key) => {
			return key + '=' + obj[key]
		})
		.join('&')
}
async function request(path, headers, body) {
	const { data } = await axios.post(host + path, queryString(body), {
		headers,
	})
	return data
}
